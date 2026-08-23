import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PlaceNarrationDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  targetLanguage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  description?: string;
}
