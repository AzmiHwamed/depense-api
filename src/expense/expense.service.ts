import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { ExpenseCategory } from 'src/expense-category/entities/expense-category.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { CreateExpenseFromReceiptDto } from './dto/create-expense-from-receipt.dto';
import {
  ExpenseQueryDto,
  ExpenseStatisticsQueryDto,
} from './dto/expense-query.dto';
import { User } from 'src/user/entities/user.entity';
import { CurrencyService } from 'src/currency/currency.service'; // ASSUMED — swap for your real conversion service if the name/method differs
import { Receipt } from 'src/receipts/entities/receipt.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NOTIFICATION_EVENT, NotificationDispatchEvent } from 'src/notification/notification.events';

type WithConversion<T> = T & {
  convertedAmount: number | null;
  convertedCurrencyId: string | null;
};

@Injectable()
export class ExpenseService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
    @InjectRepository(ExpenseCategory)
    private readonly categoryRepo: Repository<ExpenseCategory>,
    @InjectRepository(Receipt)
    private readonly receiptRepo: Repository<Receipt>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly currencyService: CurrencyService,
    private readonly eventEmitter: EventEmitter2,

  ) { }

  private async assertCategoryOwnership(
    userId: string,
    categoryId: string,
  ): Promise<void> {
    const category = await this.categoryRepo.findOne({
      where: { id: categoryId, userId },
    });
    if (!category) {
      throw new NotFoundException('Expense category not found');
    }
  }

  private async getUserOrThrow(userId: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  /**
   * Returns a resolver that, given an expense's currencyId, returns the rate
   * to multiply by to get that amount in the user's home currency (or null
   * if conversion isn't possible — e.g. user has no home currency set).
   * Caches one lookup per distinct currency so batch operations (findAll,
   * statistics) don't call the conversion service once per row.
   */
  private getRateResolver(user: User): (currencyId: string | null | undefined) => Promise<number | null> {
    const rateCache = new Map<string, number>();

    return async (currencyId: string | null | undefined): Promise<number | null> => {
      if (!user.currencyId || !currencyId) return null;
      if (currencyId === user.currencyId) return 1;

      if (!rateCache.has(currencyId)) {
        const { convertedAmount } = await this.currencyService.convert(
          1,
          currencyId,
          user.currencyId,
        );
        rateCache.set(currencyId, convertedAmount);
      }
      return rateCache.get(currencyId)!;
    };
  }

  private toConvertedAmount(amount: string | number, rate: number | null): number | null {
    if (rate === null) return null;
    return Math.round(Number(amount) * rate * 100) / 100;
  }

  private async attachConvertedAmount<T extends Expense>(
    userId: string,
    expense: T,
  ): Promise<WithConversion<T>> {
    const user = await this.getUserOrThrow(userId);
    const getRate = this.getRateResolver(user);
    const rate = await getRate(expense.currencyId);

    return {
      ...expense,
      convertedAmount: this.toConvertedAmount(expense.amount, rate),
      convertedCurrencyId: user.currencyId ?? null,
    };
  }

  async create(userId: string, dto: CreateExpenseDto): Promise<WithConversion<Expense>> {
    await this.assertCategoryOwnership(userId, dto.categoryId);

    const expense = this.expenseRepo.create({
      ...dto,
      amount: dto.amount.toString(),
      date: new Date(dto.date),
      userId,
    });
    const saved = await this.expenseRepo.save(expense);

    this.emitExpenseNotification(saved);

    return this.attachConvertedAmount(userId, saved);
  }
  private emitExpenseNotification(expense: Expense): void {
    this.eventEmitter.emit(
      NOTIFICATION_EVENT,
      new NotificationDispatchEvent(
        'Expense added',
        `A new expense of ${expense.amount} was recorded${expense.shop ? ` at ${expense.shop}` : ''}`,
        expense.userId,
        {
          expenseId: expense.id,
          amount: expense.amount,
          categoryId: expense.categoryId ?? '',
        },
      ),
    );
  }

  async findAll(userId: string, query: ExpenseQueryDto): Promise<WithConversion<Expense>[]> {
    const qb = this.expenseRepo
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.category', 'category')
      .leftJoinAndSelect('expense.currency', 'currency')
      .where('expense.userId = :userId', { userId });

    if (query.categoryId) {
      qb.andWhere('expense.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }
    if (query.startDate) {
      qb.andWhere('expense.date >= :startDate', {
        startDate: query.startDate,
      });
    }
    if (query.endDate) {
      qb.andWhere('expense.date <= :endDate', { endDate: query.endDate });
    }

    qb.orderBy('expense.date', 'DESC');
    const expenses = await qb.getMany();

    const user = await this.getUserOrThrow(userId);
    const getRate = this.getRateResolver(user);

    return Promise.all(
      expenses.map(async (expense) => {
        const rate = await getRate(expense.currencyId);
        return {
          ...expense,
          convertedAmount: this.toConvertedAmount(expense.amount, rate),
          convertedCurrencyId: user.currencyId ?? null,
        };
      }),
    );
  }

  async findOne(userId: string, id: string): Promise<WithConversion<Expense>> {
    const expense = await this.expenseRepo.findOne({
      where: { id, userId },
      relations: { category: true, currency: true },
    });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    return this.attachConvertedAmount(userId, expense);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateExpenseDto,
  ): Promise<WithConversion<Expense>> {
    // Re-fetch the plain entity (not the converted version) so Object.assign
    // below doesn't try to persist convertedAmount/convertedCurrencyId.
    const expense = await this.expenseRepo.findOne({
      where: { id, userId },
      relations: { category: true, currency: true },
    });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    if (dto.categoryId) {
      await this.assertCategoryOwnership(userId, dto.categoryId);
    }

    Object.assign(expense, {
      ...dto,
      amount: dto.amount !== undefined ? dto.amount.toString() : expense.amount,
      date: dto.date ? new Date(dto.date) : expense.date,
    });

    const saved = await this.expenseRepo.save(expense);
    return this.attachConvertedAmount(userId, saved);
  }

  async remove(userId: string, id: string): Promise<void> {
    const expense = await this.expenseRepo.findOne({ where: { id, userId } });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    await this.expenseRepo.remove(expense);
  }

  // ── Create from receipt ─────────────────────
  async createFromReceipt(userId: string, dto: CreateExpenseFromReceiptDto) {
    const receipt = await this.receiptRepo.findOne({
      where: { id: dto.receiptId },
    });
    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }

    const categoryId = dto.categoryId ?? null;
    if (!categoryId) {
      throw new NotFoundException(
        'Expense category not found — pass categoryId if the receipt was not auto-categorized',
      );
    }
    await this.assertCategoryOwnership(userId, categoryId);

    const amount = dto.amount ?? receipt.total;
    const description = dto.description ?? receipt.merchant ?? undefined;
    const date = dto.date ? new Date(dto.date) : new Date(receipt.date);

    const expense = this.expenseRepo.create({
      amount: amount.toString(),
      description,
      shop: receipt.merchant ?? undefined,
      date,
      categoryId,
      currencyId: await this.currencyService.findByCode(receipt.currency).then((currency) => currency.id),
      userId,
    });
    const saved = await this.expenseRepo.save(expense);

    // findOne already returns convertedAmount/convertedCurrencyId in the
    // user's home currency, so there's nothing extra to attach here.
    return this.findOne(userId, saved.id);
  }

  // ── Statistics ──────────────────────────────
  // Everything below is computed in the user's home currency. Amounts are
  // pulled per-expense and converted in memory (rather than SUM'd in SQL)
  // because expenses can each carry their own currency — a raw SQL SUM
  // would silently mix currencies together.
  async getStatistics(userId: string, query: ExpenseStatisticsQueryDto) {
    const groupBy = query.groupBy ?? 'month';
    const user = await this.getUserOrThrow(userId);
    const getRate = this.getRateResolver(user);

    const qb = this.expenseRepo
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.category', 'category')
      .where('expense.userId = :userId', { userId });

    if (query.startDate) {
      qb.andWhere('expense.date >= :startDate', {
        startDate: query.startDate,
      });
    }
    if (query.endDate) {
      qb.andWhere('expense.date <= :endDate', { endDate: query.endDate });
    }

    const expenses = await qb.getMany();

    const converted = await Promise.all(
      expenses.map(async (expense) => {
        const rate = await getRate(expense.currencyId);
        return {
          expense,
          amount: this.toConvertedAmount(expense.amount, rate) ?? 0,
        };
      }),
    );

    const round2 = (n: number) => Math.round(n * 100) / 100;

    const total = converted.reduce((sum, row) => sum + row.amount, 0);
    const count = converted.length;

    const byCategoryMap = new Map<
      string,
      { categoryId: string | null; categoryName: string; categoryColor: string | null; total: number; count: number }
    >();
    for (const { expense, amount } of converted) {
      const key = expense.categoryId ?? '__uncategorized__';
      const entry = byCategoryMap.get(key) ?? {
        categoryId: expense.categoryId ?? null,
        categoryName: expense.category?.name ?? 'Uncategorized',
        categoryColor: expense.category?.color ?? null,
        total: 0,
        count: 0,
      };
      entry.total += amount;
      entry.count += 1;
      byCategoryMap.set(key, entry);
    }

    const periodKey = (date: Date | string): string => {
      const d = new Date(date);
      if (groupBy === 'day') {
        return d.toISOString().slice(0, 10);
      }
      if (groupBy === 'year') {
        return `${d.getUTCFullYear()}-01-01`;
      }
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
    };

    const byPeriodMap = new Map<string, { period: string; total: number; count: number }>();
    for (const { expense, amount } of converted) {
      const key = periodKey(expense.date);
      const entry = byPeriodMap.get(key) ?? { period: key, total: 0, count: 0 };
      entry.total += amount;
      entry.count += 1;
      byPeriodMap.set(key, entry);
    }

    return {
      total: round2(total),
      count,
      currencyId: user.currencyId ?? null,
      groupBy,
      byCategory: Array.from(byCategoryMap.values())
        .map((row) => ({ ...row, total: round2(row.total) }))
        .sort((a, b) => b.total - a.total),
      byPeriod: Array.from(byPeriodMap.values())
        .map((row) => ({ ...row, total: round2(row.total) }))
        .sort((a, b) => a.period.localeCompare(b.period)),
    };
  }
}