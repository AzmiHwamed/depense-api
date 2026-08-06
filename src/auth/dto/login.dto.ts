import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'test@example.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'secret123', minLength: 6, description: 'Password (min 6 characters)' })
  @IsString()
  @MinLength(6)
  password: string;
}