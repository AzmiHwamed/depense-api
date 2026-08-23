import { IsOptional, IsUUID, IsDateString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ExpenseQueryDto {
  @ApiPropertyOptional({ description: 'Filter by trip' })
  @IsOptional()
  @IsUUID()
  tripId?: string;
  @ApiPropertyOptional({ example: '2026-07-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-07-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    example: 'b3f1c2a0-1234-4a5b-8c9d-abcdef123456',
    description: 'Filter expenses belonging to a specific category',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}

export class ExpenseStatisticsQueryDto {
  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    enum: ['day', 'month', 'year'],
    default: 'month',
    description: 'Granularity for the time-based breakdown',
  })
  @IsOptional()
  @IsIn(['day', 'month', 'year'])
  groupBy?: 'day' | 'month' | 'year' = 'month';
}
