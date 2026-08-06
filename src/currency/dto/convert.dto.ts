import { IsNumber, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ConvertDto {
  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Your DB currency ID (not the ISO code)',
    example: 'a1b2c3d4-...',
  })
  @IsUUID()
  fromCurrencyId: string;

  @ApiProperty({
    description: 'Your DB currency ID (not the ISO code)',
    example: 'e5f6g7h8-...',
  })
  @IsUUID()
  toCurrencyId: string;
}
