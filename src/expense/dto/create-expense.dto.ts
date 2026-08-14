import {
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  IsUUID,
  IsDateString,
  MaxLength,
  IsLatitude,
  IsLongitude,
  IsUrl,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExpenseDto {
  @ApiProperty({
    example: 42.5,
    description: 'Expense amount, must be positive',
  })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ example: 'Weekly grocery run', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 'Ferdaws Market', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  shop?: string;

  @ApiProperty({
    example: '2026-07-26T00:00:00.000Z',
    description: 'ISO date string for when the expense occurred',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    example: 'b3f1c2a0-1234-4a5b-8c9d-abcdef123456',
    description: 'ID of an expense category owned by the authenticated user',
  })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({
    example: 'c9d8e7f6-4321-4b5a-9c8d-fedcba654321',
    description: "Falls back to the user's default currency if omitted",
  })
  @IsOptional()
  @IsUUID()
  currencyId?: string;

  @ApiPropertyOptional({ example: 'ChIJ...' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  googlePlaceId?: string;

  @ApiPropertyOptional({ example: 'Mall of Gabès, Gabès, Tunisia' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  merchantAddress?: string;

  @ApiPropertyOptional({ example: 33.8815 })
  @IsOptional()
  @IsLatitude()
  merchantLatitude?: number;

  @ApiPropertyOptional({ example: 10.0982 })
  @IsOptional()
  @IsLongitude()
  merchantLongitude?: number;

  @ApiPropertyOptional({ example: 'https://maps.google.com/?cid=...' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2000)
  googleMapsUri?: string;

  @ApiPropertyOptional({ example: 91, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  merchantMatchConfidence?: number;
}
