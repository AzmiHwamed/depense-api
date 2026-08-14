import { IsIn, IsLatitude, IsLongitude, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class LocationCheckInDto {
  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  accuracy?: number;

  @IsOptional()
  @IsIn(['en', 'fr', 'ar'])
  languageCode?: 'en' | 'fr' | 'ar';
}
