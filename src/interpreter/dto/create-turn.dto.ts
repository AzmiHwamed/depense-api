import { IsEnum, IsString, Length } from 'class-validator';
import { InterpreterSpeaker } from '../entities/interpreter-turn.entity';

export class CreateInterpreterTurnDto {
  @IsEnum(InterpreterSpeaker) speaker: InterpreterSpeaker;
  @IsString() @Length(2, 35) sourceLanguage: string;
  @IsString() @Length(2, 35) targetLanguage: string;
}
