import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: '1234', description: '4-digit code sent by email' })
  @IsString()
  @Length(4, 4)
  otp: string;
}