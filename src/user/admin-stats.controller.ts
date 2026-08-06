import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminStatsService } from './admin-stats.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { AdminGuard } from '../auth/admin.guard';

@ApiTags('Admin - Stats')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard, AdminGuard)
@Controller('admin/stats')
export class AdminStatsController {
  constructor(private readonly statsService: AdminStatsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Total users, subscription breakdown, admin count' })
  getOverview() {
    return this.statsService.getOverview();
  }

  @Get('users-per-country')
  @ApiOperation({ summary: 'User count grouped by current country' })
  getUsersPerCountry() {
    return this.statsService.getUsersPerCountry();
  }

  @Get('users-per-currency')
  @ApiOperation({ summary: 'User count grouped by currency preference' })
  getUsersPerCurrency() {
    return this.statsService.getUsersPerCurrency();
  }

  @Get('users-per-provider')
  @ApiOperation({ summary: 'User count grouped by sign-in provider' })
  getUsersPerProvider() {
    return this.statsService.getUsersPerProvider();
  }

  @Get('signups-over-time')
  @ApiOperation({ summary: 'Daily signup counts for the last N days' })
  @ApiQuery({ name: 'days', required: false, example: 30 })
  getSignupsOverTime(@Query('days') days?: number) {
    return this.statsService.getSignupsOverTime(Number(days) || 30);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Revenue and payment status summary' })
  getRevenue() {
    return this.statsService.getRevenueSummary();
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Full combined dashboard — all stats in one call' })
  getDashboard() {
    return this.statsService.getFullDashboard();
  }
}
