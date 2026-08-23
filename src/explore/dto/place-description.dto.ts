import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PlaceDescriptionDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  languageCode?: string;
}
