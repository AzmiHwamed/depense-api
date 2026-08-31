import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import { Currency } from './entities/currency.entity';

interface FrankfurterCurrency {
  iso_code: string;
  iso_numeric: string;
  name: string;
  symbol: string;
  start_date: string;
  [key: string]: any;
}

interface FrankfurterLatestRates {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

interface FrankfurterTimeSeries {
  amount: number;
  base: string;
  start_date: string;
  end_date: string;
  rates: Record<string, Record<string, number>>;
}

const POPULAR_CURRENCY_CODES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CHF',
  'CAD',
  'AUD',
  'CNY',
] as const;

const CURRENCY_BADGES: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CHF: 'Fr',
  CAD: '$',
  AUD: 'A$',
  CNY: '¥',
};

@Injectable()
export class CurrencyService implements OnModuleInit {
  private readonly logger = new Logger(CurrencyService.name);
  private readonly frankfurterUrl = 'https://api.frankfurter.dev/v1';
  private readonly frankfurterV2Url = 'https://api.frankfurter.dev/v2';

  constructor(
    @InjectRepository(Currency) private currencyRepo: Repository<Currency>,
  ) {}

  // ── Runs automatically once, when the app boots ──────────
  async onModuleInit() {
    const count = await this.currencyRepo.count();
    if (count > 0) {
      this.logger.log(`Currencies already seeded (${count} rows) — skipping.`);
      return;
    }

    await this.seedFromFrankfurter();
  }

  // ── Seed the currencies table from Frankfurter's v2 endpoint ──
  private async seedFromFrankfurter(): Promise<void> {
    this.logger.log('Fetching currency list from Frankfurter (scope=all)...');

    let currencies: FrankfurterCurrency[];
    try {
      const res = await fetch(`${this.frankfurterV2Url}/currencies?scope=all`);
      if (!res.ok) {
        throw new Error(`Frankfurter responded with status ${res.status}`);
      }
      currencies = await res.json();
    } catch (err) {
      this.logger.error(
        `Failed to fetch currencies from Frankfurter, seeding skipped: ${err.message}`,
      );
      return;
    }

    if (!Array.isArray(currencies) || currencies.length === 0) {
      this.logger.warn('Frankfurter returned no currencies — nothing to seed.');
      return;
    }

    // Map external shape (iso_code/name) onto our existing entity fields (code/name)
    // Dedupe by code just in case the API ever returns overlapping entries
    const seen = new Set<string>();
    const entities = currencies
      .filter((c) => {
        if (!c.iso_code || seen.has(c.iso_code)) return false;
        seen.add(c.iso_code);
        return true;
      })
      .map((c) =>
        this.currencyRepo.create({
          code: c.iso_code.toUpperCase(),
          name: c.name,
        }),
      );

    await this.currencyRepo.save(entities);
    this.logger.log(`Seeded ${entities.length} currencies from Frankfurter.`);
  }

  // ── CRUD, all keyed by your own DB id ────────────────────
  findAll(): Promise<Currency[]> {
    return this.currencyRepo.find({ order: { code: 'ASC' } });
  }

  async findOne(id: string): Promise<Currency> {
    const currency = await this.currencyRepo.findOne({ where: { id } });
    if (!currency)
      throw new NotFoundException(`Currency with id ${id} not found`);
    return currency;
  }

  async findByCode(code: string): Promise<Currency> {
    const currency = await this.currencyRepo.findOne({
      where: { code: code.toUpperCase() },
    });
    if (!currency)
      throw new NotFoundException(`Currency with code ${code} not found`);
    return currency;
  }

  async create(dto: CreateCurrencyDto): Promise<Currency> {
    const existing = await this.currencyRepo.findOne({
      where: { code: dto.code.toUpperCase() },
    });
    if (existing)
      throw new BadRequestException(`Currency ${dto.code} already exists`);

    const currency = this.currencyRepo.create({
      ...dto,
      code: dto.code.toUpperCase(),
    });
    return this.currencyRepo.save(currency);
  }

  async update(id: string, dto: UpdateCurrencyDto): Promise<Currency> {
    const currency = await this.findOne(id);
    Object.assign(currency, dto);
    if (dto.code) currency.code = dto.code.toUpperCase();
    return this.currencyRepo.save(currency);
  }

  async remove(id: string): Promise<void> {
    const currency = await this.findOne(id);
    await this.currencyRepo.remove(currency);
  }

  // ── Conversion, resolving your DB ids → ISO codes → Frankfurter ──
  async convert(amount: number, fromCurrencyId: string, toCurrencyId: string) {
    const [from, to] = await Promise.all([
      this.findOne(fromCurrencyId),
      this.findOne(toCurrencyId),
    ]);
    console.log(`${this.frankfurterV2Url}/rate/${from.code}/${to.code}`);
    const res = await fetch(
      `${this.frankfurterV2Url}/rate/${from.code}/${to.code}`,
    );

    if (!res.ok) {
      throw new BadRequestException(
        'Conversion failed — external rate service error',
      );
    }

    const data: { date: string; base: string; quote: string; rate: number } =
      await res.json();

    const convertedAmount = amount * data.rate;

    return {
      from: { id: from.id, code: from.code, name: from.name },
      to: { id: to.id, code: to.code, name: to.name },
      originalAmount: amount,
      convertedAmount: Number(convertedAmount.toFixed(2)),
      rate: data.rate,
      date: data.date,
    };
  }

  async getPopularRates(baseCurrencyId: string) {
    if (!baseCurrencyId) {
      throw new BadRequestException(
        'Set a home currency before requesting popular exchange rates',
      );
    }

    const base = await this.findOne(baseCurrencyId);
    const targetCodes = POPULAR_CURRENCY_CODES.filter(
      (code) => code !== base.code,
    );
    const query = new URLSearchParams({
      base: base.code,
      symbols: targetCodes.join(','),
    });

    let data: FrankfurterLatestRates;
    let previousData: FrankfurterTimeSeries;
    try {
      const res = await fetch(`${this.frankfurterUrl}/latest?${query}`);
      if (!res.ok) {
        throw new Error(`Frankfurter responded with status ${res.status}`);
      }
      data = await res.json();

      const latestDate = new Date(`${data.date}T00:00:00.000Z`);
      latestDate.setUTCDate(latestDate.getUTCDate() - 21);
      const historyStart = latestDate.toISOString().slice(0, 10);
      const historyRes = await fetch(
        `${this.frankfurterUrl}/${historyStart}..${data.date}?${query}`,
      );
      if (!historyRes.ok) {
        throw new Error(
          `Frankfurter responded with status ${historyRes.status}`,
        );
      }
      previousData = await historyRes.json();
    } catch (error) {
      this.logger.error(
        `Failed to fetch popular rates for ${base.code}: ${(error as Error).message}`,
      );
      throw new BadRequestException(
        'Unable to retrieve exchange rates from the external rate service',
      );
    }

    const currencies = await this.currencyRepo.find({
      where: { code: In(Object.keys(data.rates)), isActive: true },
    });
    const currenciesByCode = new Map(
      currencies.map((currency) => [currency.code, currency]),
    );
    const previousDates = Object.keys(previousData.rates)
      .filter((date) => date < data.date)
      .sort()
      .slice(-4);

    if (previousDates.length < 4) {
      throw new BadRequestException(
        'Four previous exchange-rate dates are not available for comparison',
      );
    }
    const previousDate = previousDates.at(-1)!;
    const previousRates = previousData.rates[previousDate];

    return targetCodes.flatMap((code) => {
      const currency = currenciesByCode.get(code);
      const rate = data.rates[code];
      const previousRate = previousRates?.[code];
      if (
        !currency ||
        typeof rate !== 'number' ||
        typeof previousRate !== 'number'
      ) {
        return [];
      }

      const change = rate - previousRate;
      const changePercent = (change / previousRate) * 100;
      const historicalRates = previousDates
        .map((date) => previousData.rates[date]?.[code])
        .filter((historicalRate): historicalRate is number =>
          Number.isFinite(historicalRate),
        );

      if (historicalRates.length < 4) {
        return [];
      }
      const formattedRate = Number(rate.toFixed(6)).toString();

      return [
        {
          currencyId: currency.id,
          currencyCode: currency.code,
          label: currency.code,
          badgeText: CURRENCY_BADGES[currency.code] ?? currency.code,
          conversionText: `1 ${base.code} = ${formattedRate} ${currency.code}`,
          rate,
          changePercent: Number(changePercent.toFixed(4)),
          rateHistory: [...historicalRates, rate],
        },
      ];
    });
  }
}
