import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: '5678', description: '4-digit passResetToken from step 2' })
  @IsString()
  @Length(4, 4)
  resetPassToken: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword: string;
}