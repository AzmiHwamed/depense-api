import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreateInterpreterConversationDto {
  @IsString() @Length(2, 35) travelerLanguage: string;
  @IsString() @Length(2, 35) localLanguage: string;
  @IsOptional() @IsString() @MaxLength(120) title?: string;
}
