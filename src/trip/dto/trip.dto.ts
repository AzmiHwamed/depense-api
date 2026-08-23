import { PartialType } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTripDto {
  @IsString() @MaxLength(150) name: string;
  @IsString() @MaxLength(200) destination: string;
  @IsOptional() @IsString() @MaxLength(100) country?: string;
  @IsOptional() @IsUUID() countryId?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsInt() @Min(1) @Max(50) travelers = 1;
  @IsDateString() startDate: string;
  @IsDateString() endDate: string;
  @IsNumber() @IsPositive() totalAmount: number;
  @IsUUID() currencyId: string;
  @IsOptional() @IsArray() @ArrayMaxSize(20) interests?: string[];
  @IsOptional() @IsArray() categoryLimits?: unknown[];
  @IsOptional() @IsObject() reminders?: Record<string, unknown>;
}

export class UpdateTripDto extends PartialType(CreateTripDto) {
  @IsOptional() @IsArray() monuments?: unknown[];
  @IsOptional() @IsArray() itinerary?: unknown[];
}
