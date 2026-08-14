import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class CheckCountryDto {
  @ApiProperty({
    example: 'FR',
    description: 'ISO 3166-1 alpha-2 country code detected from the device location',
  })
  @IsString()
  @Matches(/^[A-Za-z]{2}$/, {
    message: 'detectedCountryCode must be a two-letter ISO country code',
  })
  detectedCountryCode: string;
}
