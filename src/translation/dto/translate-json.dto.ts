import { IsOptional, IsString, IsArray } from 'class-validator';

export class TranslateJsonDto {
  data: any; // any JSON-serializable value (object, array, primitive)

  @IsOptional()
  @IsString()
  target?: string; // falls back to current user's language if omitted

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsArray()
  ignoreKeys?: string[];
}