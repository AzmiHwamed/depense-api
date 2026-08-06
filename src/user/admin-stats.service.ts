import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  User,
  SubscriptionStatus,
  AuthProvider,
  UserRole,
} from './entities/user.entity';
import { Payment, PaymentStatus } from '../payment/entities/payment.entity';

@Injectable()
export class AdminStatsService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Payment) private paymentsRepo: Repository<Payment>,
  ) {}

  async getOverview() {
    const [
      totalUsers,
      activeUsers,
      trialUsers,
      expiredUsers,
      cancelledUsers,
      adminCount,
    ] = await Promise.all([
      this.usersRepo.count(),
      this.usersRepo.count({
        where: { subscriptionStatus: SubscriptionStatus.ACTIVE },
      }),
      this.usersRepo.count({
        where: { subscriptionStatus: SubscriptionStatus.TRIAL },
      }),
      this.usersRepo.count({
        where: { subscriptionStatus: SubscriptionStatus.EXPIRED },
      }),
      this.usersRepo.count({
        where: { subscriptionStatus: SubscriptionStatus.CANCELLED },
      }),
      this.usersRepo.count({ where: { role: UserRole.ADMIN } }),
    ]);

    return {
      totalUsers,
      adminCount,
      subscriptionBreakdown: {
        active: activeUsers,
        trial: trialUsers,
        expired: expiredUsers,
        cancelled: cancelledUsers,
      },
    };
  }

  // ── Users per country ──────────────────
  async getUsersPerCountry() {
    return this.usersRepo
      .createQueryBuilder('user')
      .leftJoin('user.currentCountry', 'country')
      .select('country.id', 'countryId')
      .addSelect('country.name', 'countryName')
      .addSelect('country.alpha2Code', 'alpha2Code')
      .addSelect('COUNT(user.id)', 'userCount')
      .groupBy('country.id')
      .addGroupBy('country.name')
      .addGroupBy('country.alpha2Code')
      .orderBy('"userCount"', 'DESC')
      .getRawMany();
  }

  // ── Users per currency ──────────────────
  async getUsersPerCurrency() {
    return this.usersRepo
      .createQueryBuilder('user')
      .leftJoin('user.currency', 'currency')
      .select('currency.id', 'currencyId')
      .addSelect('currency.code', 'currencyCode')
      .addSelect('currency.name', 'currencyName')
      .addSelect('COUNT(user.id)', 'userCount')
      .groupBy('currency.id')
      .addGroupBy('currency.code')
      .addGroupBy('currency.name')
      .orderBy('"userCount"', 'DESC')
      .getRawMany();
  }

  // ── Users per sign-in provider (password/google/facebook) ──
  async getUsersPerProvider() {
    return this.usersRepo
      .createQueryBuilder('user')
      .select('user.provider', 'provider')
      .addSelect('COUNT(user.id)', 'userCount')
      .groupBy('user.provider')
      .orderBy('"userCount"', 'DESC')
      .getRawMany();
  }

  // ── New signups over time (daily, last N days) ──
  async getSignupsOverTime(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.usersRepo
      .createQueryBuilder('user')
      .select('DATE(user.createdAt)', 'date')
      .addSelect('COUNT(user.id)', 'signups')
      .where('user.createdAt >= :since', { since })
      .groupBy('DATE(user.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();
  }

  // ── Revenue summary from Payment records ──
  async getRevenueSummary() {
    const [totalRevenueRaw, succeededCount, pendingCount, failedCount] =
      await Promise.all([
        this.paymentsRepo
          .createQueryBuilder('payment')
          .select('SUM(payment.amount)', 'total')
          .where('payment.status = :status', {
            status: PaymentStatus.SUCCEEDED,
          })
          .getRawOne(),
        this.paymentsRepo.count({ where: { status: PaymentStatus.SUCCEEDED } }),
        this.paymentsRepo.count({ where: { status: PaymentStatus.PENDING } }),
        this.paymentsRepo.count({ where: { status: PaymentStatus.FAILED } }),
      ]);

    return {
      // Note: this sums raw amounts across potentially different currencies —
      // meaningful only once payments are normalized to one settlement currency,
      // otherwise treat this as a rough count-based indicator until then.
      totalRevenueRaw: Number(totalRevenueRaw?.total ?? 0),
      succeededPayments: succeededCount,
      pendingPayments: pendingCount,
      failedPayments: failedCount,
    };
  }

  // ── Everything combined, one call for a dashboard ──
  async getFullDashboard() {
    const [
      overview,
      perCountry,
      perCurrency,
      perProvider,
      signups30d,
      revenue,
    ] = await Promise.all([
      this.getOverview(),
      this.getUsersPerCountry(),
      this.getUsersPerCurrency(),
      this.getUsersPerProvider(),
      this.getSignupsOverTime(30),
      this.getRevenueSummary(),
    ]);

    return {
      overview,
      usersPerCountry: perCountry,
      usersPerCurrency: perCurrency,
      usersPerProvider: perProvider,
      signupsLast30Days: signups30d,
      revenue,
    };
  }
}
