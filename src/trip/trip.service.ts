import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { CurrencyService } from 'src/currency/currency.service';
import { Expense } from 'src/expense/entities/expense.entity';
import { ExpenseCategory } from 'src/expense-category/entities/expense-category.entity';
import { Country } from 'src/country/entities/country.entity';
import { Repository } from 'typeorm';
import { CreateTripDto, UpdateTripDto } from './dto/trip.dto';
import { Trip } from './entities/trip.entity';
import { TokenWalletService } from 'src/user/token-wallet.service';

@Injectable()
export class TripService {
  private readonly aiUrl: string;
  private readonly googleMapsApiKey?: string;
  constructor(
    @InjectRepository(Trip) private readonly trips: Repository<Trip>,
    @InjectRepository(Expense) private readonly expenses: Repository<Expense>,
    @InjectRepository(ExpenseCategory)
    private readonly categories: Repository<ExpenseCategory>,
    @InjectRepository(Country)
    private readonly countries: Repository<Country>,
    private readonly currencies: CurrencyService,
    private readonly http: HttpService,
    private readonly wallet: TokenWalletService,
    config: ConfigService,
  ) {
    this.aiUrl = config.get('OCR_SERVICE_URL', 'http://localhost:8005');
    this.googleMapsApiKey = config.get<string>('GOOGLE_MAPS_API_KEY');
  }

  async create(userId: string, dto: CreateTripDto) {
    this.validateDates(dto.startDate, dto.endDate);
    await this.currencies.findOne(dto.currencyId);
    await this.resolveCountry(dto);
    await this.trips.update(
      { userId, status: 'active' },
      { status: 'completed' },
    );
    return this.trips.save(
      this.trips.create({
        ...dto,
        totalAmount: String(dto.totalAmount),
        userId,
        status: 'active',
      }),
    );
  }

  async findAll(userId: string) {
    const trips = await this.trips.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return Promise.all(trips.map((trip) => this.withFinancials(trip)));
  }

  async findOne(userId: string, id: string) {
    const trip = await this.trips.findOne({ where: { id, userId } });
    if (!trip) throw new NotFoundException('Trip not found');
    return trip;
  }

  async update(userId: string, id: string, dto: UpdateTripDto) {
    const trip = await this.findOne(userId, id);
    const start = dto.startDate ?? trip.startDate;
    const end = dto.endDate ?? trip.endDate;
    this.validateDates(start, end);
    if (dto.currencyId && dto.currencyId !== trip.currencyId)
      await this.currencies.findOne(dto.currencyId);
    await this.resolveCountry(dto);
    Object.assign(
      trip,
      dto,
      dto.totalAmount == null ? {} : { totalAmount: String(dto.totalAmount) },
    );
    return this.trips.save(trip);
  }

  async archive(userId: string, id: string) {
    const trip = await this.findOne(userId, id);
    trip.status = 'archived';
    return this.trips.save(trip);
  }

  async activate(userId: string, id: string) {
    const trip = await this.findOne(userId, id);
    await this.trips.update(
      { userId, status: 'active' },
      { status: 'completed' },
    );
    trip.status = 'active';
    return this.trips.save(trip);
  }

  async generatePlan(userId: string, id: string, languageCode = 'en') {
    const trip = await this.findOne(userId, id);
    const financials = await this.withFinancials(trip);
    const categories = await this.categories.find({ where: { userId } });
    const tokenCost = await this.wallet.getCost('tripPlan');
    await this.wallet.spend(userId, tokenCost, 'AI trip planning');
    try {
      const response = await firstValueFrom(
        this.http.post(`${this.aiUrl}/ai/trip-plan`, {
          languageCode,
          destination: trip.destination,
          country: trip.country,
          startDate: trip.startDate,
          endDate: trip.endDate,
          travelers: trip.travelers,
          interests: trip.interests ?? [],
          notes: trip.notes,
          currencyCode: trip.currency.code,
          totalBudget: Number(trip.totalAmount),
          spent: financials.spent,
          categorySpending: financials.categorySpending,
          availableCategories: categories.map((category) => ({
            name: category.name,
            description: category.description,
          })),
        }),
      );
      const plan = response.data;
      trip.monuments = await Promise.all(
        (plan.monuments ?? []).map((monument: any) =>
          this.enrichWithGooglePlace(
            monument,
            [monument.name, monument.addressHint].filter(Boolean).join(', '),
            trip,
            languageCode,
          ),
        ),
      );
      trip.itinerary = await Promise.all(
        (plan.itinerary ?? []).map(async (day: any) => ({
          ...day,
          items: await Promise.all(
            (day.items ?? []).map((item: any) =>
              this.enrichWithGooglePlace(
                item,
                [
                  item.placeSearchQuery,
                  item.monumentName,
                  item.title,
                  item.location,
                ]
                  .filter(Boolean)
                  .join(', '),
                trip,
                languageCode,
              ),
            ),
          ),
        })),
      );
      trip.budgetGuidance = plan.budgetGuidance ?? null;
      const suggestedLimits = (plan.categoryLimits ?? []).flatMap(
        (suggestion: { categoryName?: string; amount?: number }) => {
          const category = categories.find(
            (candidate) =>
              candidate.name.toLowerCase() ===
              suggestion.categoryName?.toLowerCase(),
          );
          const amount = Number(suggestion.amount);
          return category && amount > 0
            ? [
                {
                  categoryId: category.id,
                  categoryName: category.name,
                  color: category.color ?? '#7c3aed',
                  amount,
                },
              ]
            : [];
        },
      );
      const suggestedTotal = suggestedLimits.reduce(
        (sum: number, limit: { amount: number }) => sum + limit.amount,
        0,
      );
      trip.categoryLimits =
        suggestedTotal > Number(trip.totalAmount)
          ? suggestedLimits.map((limit: { amount: number }) => ({
              ...limit,
              amount:
                Math.round(
                  (limit.amount / suggestedTotal) *
                    Number(trip.totalAmount) *
                    100,
                ) / 100,
            }))
          : suggestedLimits;
      trip.aiSummary = plan.summary ?? null;
      await this.trips.save(trip);
      return this.withFinancials(trip);
    } catch (error: any) {
      await this.wallet.refund(userId, tokenCost).catch(() => undefined);
      const upstream = error?.response?.data;
      throw new BadGatewayException(
        upstream?.detail ??
          upstream?.message ??
          (error?.code === 'ECONNREFUSED'
            ? 'Trip-planning AI service is not running on the configured OCR_SERVICE_URL.'
            : 'Trip planning AI failed'),
      );
    }
  }

  private validCoordinate(value: unknown, minimum: number, maximum: number) {
    if (value === null || value === undefined || value === '') return null;
    const coordinate = Number(value);
    return Number.isFinite(coordinate) &&
      coordinate >= minimum &&
      coordinate <= maximum
      ? coordinate
      : null;
  }

  private async enrichWithGooglePlace(
    item: any,
    placeName: string | undefined,
    trip: Trip,
    languageCode: string,
  ) {
    const fallback = {
      ...item,
      latitude: null,
      longitude: null,
      googlePlaceId: null,
      googleMapsUri: null,
      formattedAddress: null,
    };
    if (!this.googleMapsApiKey || !placeName) return fallback;

    try {
      const response = await fetch(
        'https://places.googleapis.com/v1/places:searchText',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': this.googleMapsApiKey,
            'X-Goog-FieldMask':
              'places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri',
          },
          body: JSON.stringify({
            textQuery: [placeName, trip.destination, trip.country]
              .filter(Boolean)
              .join(', '),
            languageCode,
            maxResultCount: 1,
          }),
        },
      );
      if (!response.ok) return fallback;
      const payload = (await response.json()) as {
        places?: Array<{
          id?: string;
          displayName?: { text?: string };
          formattedAddress?: string;
          googleMapsUri?: string;
          location?: { latitude?: number; longitude?: number };
        }>;
      };
      const place = payload.places?.[0];
      if (!place?.id || !place.location) return fallback;
      return {
        ...fallback,
        googlePlaceId: place.id ?? null,
        googleMapsUri: place.googleMapsUri ?? null,
        recommendedPlaceName: place.displayName?.text ?? placeName,
        formattedAddress: place.formattedAddress ?? null,
        monumentName: place.displayName?.text ?? fallback.monumentName,
        location: place.formattedAddress ?? fallback.location,
        latitude: this.validCoordinate(place.location?.latitude, -90, 90),
        longitude: this.validCoordinate(place.location?.longitude, -180, 180),
      };
    } catch {
      return fallback;
    }
  }

  async getExpenses(userId: string, id: string) {
    const trip = await this.findOne(userId, id);
    return this.convertedExpenses(trip);
  }

  private async withFinancials(trip: Trip) {
    const convertedRows = await this.convertedExpenses(trip);
    let spent = 0;
    const byCategory = new Map<string, number>();
    for (const expense of convertedRows) {
      const amount = expense.convertedAmount;
      if (amount == null) continue;
      spent += amount;
      const name = expense.category?.name ?? 'Uncategorized';
      byCategory.set(name, (byCategory.get(name) ?? 0) + amount);
    }
    return {
      ...trip,
      totalAmount: Number(trip.totalAmount),
      currencyCode: trip.currency.code,
      spent: Math.round(spent * 100) / 100,
      unconvertedExpenseCount: convertedRows.filter(
        (row) => row.convertedAmount == null,
      ).length,
      categorySpending: [...byCategory].map(([name, amount]) => ({
        name,
        amount: Math.round(amount * 100) / 100,
      })),
    };
  }

  private async convertedExpenses(trip: Trip) {
    const rows = await this.expenses
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.category', 'category')
      .leftJoinAndSelect('expense.currency', 'currency')
      .where('expense.userId = :userId', { userId: trip.userId })
      .andWhere(
        '(expense.tripId = :tripId OR (expense.tripId IS NULL AND expense.date BETWEEN :start AND :end))',
        {
          tripId: trip.id,
          start: `${trip.startDate} 00:00:00`,
          end: `${trip.endDate} 23:59:59.999`,
        },
      )
      .orderBy('expense.date', 'DESC')
      .getMany();
    return Promise.all(
      rows.map(async (expense) => {
        let convertedAmount: number | null = Number(expense.amount);
        if (!expense.currencyId) convertedAmount = null;
        else if (expense.currencyId !== trip.currencyId) {
          try {
            convertedAmount = (
              await this.currencies.convert(
                convertedAmount,
                expense.currencyId,
                trip.currencyId,
              )
            ).convertedAmount;
          } catch {
            convertedAmount = null;
          }
        }
        return {
          ...expense,
          convertedAmount,
          convertedCurrencyId: trip.currencyId,
        };
      }),
    );
  }

  private validateDates(start: string, end: string) {
    if (end < start)
      throw new BadRequestException('End date must be on or after start date');
  }

  private async resolveCountry(dto: { countryId?: string; country?: string }) {
    if (!dto.countryId) return;
    const country = await this.countries.findOne({
      where: { id: dto.countryId, isActive: true },
    });
    if (!country) throw new BadRequestException('Country not found');
    dto.country = country.name;
  }
}
