import {
  IsString,
  Length,
  IsOptional,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCountryDto {
  @ApiProperty({ example: 'United States' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'US' })
  @IsString()
  @Length(2, 2)
  alpha2Code: string;

  @ApiProperty({ example: 'USA' })
  @IsString()
  @Length(3, 3)
  alpha3Code: string;

  @ApiProperty({ example: '🇺🇸', required: false })
  @IsOptional()
  @IsString()
  flag?: string;

  @ApiProperty({ example: 'Americas', required: false })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({ example: 'Washington, D.C.', required: false })
  @IsOptional()
  @IsString()
  capital?: string;

  @ApiProperty({ description: 'Your DB currency id', required: false })
  @IsOptional()
  @IsUUID()
  currencyId?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
