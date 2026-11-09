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
  @ApiProperty({ example: '100 AI tokens' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'A token package for AI services', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 100, description: 'Tokens granted after successful payment' })
  @IsInt()
  @Min(1)
  tokenCount: number;

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
