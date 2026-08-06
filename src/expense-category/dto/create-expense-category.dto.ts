import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExpenseCategoryDto {
  @ApiProperty({ example: 'Groceries', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'shopping-cart',
    description: 'Icon key used by the frontend',
  })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({
    example: '#22C55E',
    description: 'Hex color used for UI badges/charts',
  })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({
    example: 'Weekly food and household shopping',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
