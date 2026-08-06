import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateFaqCategoryDto {
  @ApiProperty({ example: 'Account', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'Questions about managing your account',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    example: 0,
    description: 'Lower numbers are shown first',
  })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFaqCategoryDto extends PartialType(CreateFaqCategoryDto) {}
