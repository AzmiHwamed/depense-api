import { IsUUID, IsOptional, IsString, IsNumber, MaxLength, IsDateString, IsLatitude, IsLongitude, IsUrl, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExpenseFromReceiptDto {
  @ApiProperty({
    example: 'a1b2c3d4-1234-4a5b-8c9d-abcdef123456',
    description: 'ID of a previously-scanned receipt owned by the authenticated user',
  })
  @IsUUID()
  receiptId: string;

  @ApiPropertyOptional({
    description:
      'Optional category override — used when the receipt was not auto-categorized, or the user wants to recategorize it at creation time',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    example: 'Groceries from Carrefour',
    description: 'Optional description override (defaults to the receipt merchant name)',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    example: 42.5,
    description: 'Optional amount override (defaults to the receipt total)',
  })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({
    description: 'Currency of the amount override; defaults to the receipt currency',
  })
  @IsOptional()
  @IsUUID()
  amountCurrencyId?: string;

  @ApiPropertyOptional({
    example: '2026-07-30',
    description: 'Optional date override (defaults to the receipt date)',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: 'Carrefour Market Gabès' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  merchantName?: string;

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
