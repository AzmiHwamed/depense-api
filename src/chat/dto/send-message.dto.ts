import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: 'Hi, I have a question about my invoice.' })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body: string;
}
