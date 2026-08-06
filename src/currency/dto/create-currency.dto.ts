import { IsString, Length, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCurrencyDto {
  @ApiProperty({ example: 'USD' })
  @IsString()
  @Length(3, 3)
  code: string;

  @ApiProperty({ example: 'United States Dollar' })
  @IsString()
  name: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
