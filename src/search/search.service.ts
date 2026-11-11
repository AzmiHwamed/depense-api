import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Receipt } from 'src/receipts/entities/receipt.entity';
import { Trip } from 'src/trip/entities/trip.entity';
import { Expense } from 'src/expense/entities/expense.entity';

export type SearchResult = {
  receipts: Array<{ id: string; title: string; subtitle: string | null; createdAt: Date }>;
  places: Array<{ id: string; title: string; subtitle: string | null; googlePlaceId: string | null }>;
  trips: Array<{ id: string; title: string; subtitle: string | null; startDate: string; endDate: string }>;
};

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Receipt) private readonly receipts: Repository<Receipt>,
    @InjectRepository(Expense) private readonly expenses: Repository<Expense>,
    @InjectRepository(Trip) private readonly trips: Repository<Trip>,
  ) {}

  async search(userId: string, query: string): Promise<SearchResult> {
    const pattern = `%${query.replace(/[\\%_]/g, '\\$&')}%`;
    const [receipts, places, trips] = await Promise.all([
      this.receipts
        .createQueryBuilder('receipt')
        .where('receipt.userId = :userId', { userId })
        .andWhere(
          '(LOWER(receipt.merchant) LIKE LOWER(:pattern) OR LOWER(receipt.address) LIKE LOWER(:pattern) OR LOWER(receipt.invoiceNumber) LIKE LOWER(:pattern) OR LOWER(receipt.rawText) LIKE LOWER(:pattern))',
          { pattern },
        )
        .orderBy('receipt.createdAt', 'DESC')
        .take(5)
        .getMany(),
      this.expenses
        .createQueryBuilder('expense')
        .where('expense.userId = :userId', { userId })
        .andWhere(
          '(LOWER(expense.shop) LIKE LOWER(:pattern) OR LOWER(expense.merchantAddress) LIKE LOWER(:pattern))',
          { pattern },
        )
        .orderBy('expense.updatedAt', 'DESC')
        .take(5)
        .getMany(),
      this.trips
        .createQueryBuilder('trip')
        .where('trip.userId = :userId', { userId })
        .andWhere(
          '(LOWER(trip.name) LIKE LOWER(:pattern) OR LOWER(trip.destination) LIKE LOWER(:pattern) OR LOWER(trip.country) LIKE LOWER(:pattern) OR LOWER(trip.notes) LIKE LOWER(:pattern))',
          { pattern },
        )
        .orderBy('trip.updatedAt', 'DESC')
        .take(5)
        .getMany(),
    ]);

    return {
      receipts: receipts.map((receipt) => ({
        id: receipt.id,
        title: receipt.merchant || receipt.originalFileName || 'Receipt',
        subtitle: receipt.address || receipt.invoiceNumber || null,
        createdAt: receipt.createdAt,
      })),
      places: places.map((expense) => ({
        id: expense.id,
        title: expense.shop,
        subtitle: expense.merchantAddress || null,
        googlePlaceId: expense.googlePlaceId || null,
      })),
      trips: trips.map((trip) => ({
        id: trip.id,
        title: trip.name,
        subtitle: [trip.destination, trip.country].filter(Boolean).join(', ') || null,
        startDate: trip.startDate,
        endDate: trip.endDate,
      })),
    };
  }
}
