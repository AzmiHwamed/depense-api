import {
  IsString,
  IsInt,
  IsNumber,
  IsUUID,
  IsOptional,
  IsBoolean,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentPlanDto {
  @ApiProperty({ example: 'Quarterly Plan' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Access for 3 months', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  durationMonths: number;

  @ApiProperty({ example: 10, description: 'Price in the base currency' })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty({
    description: 'Your DB currency id for the base price (typically USD)',
  })
  @IsUUID()
  baseCurrencyId: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
