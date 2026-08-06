import { IsOptional, IsString } from 'class-validator';

export class TranslateTextDto {
  @IsString()
  text: string;

  @IsOptional()
  @IsString()
  target?: string; // falls back to current user's language if omitted

  @IsOptional()
  @IsString()
  source?: string;
}