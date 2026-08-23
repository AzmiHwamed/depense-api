import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class MerchantMatchDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  merchantName: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  receiptAddress?: string | null;

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  @IsIn(['en', 'fr', 'ar'])
  languageCode?: string;
}
