import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ example: 'AMf-vBy...', description: 'Refresh token returned from login/register' })
  @IsString()
  refreshToken: string;
}