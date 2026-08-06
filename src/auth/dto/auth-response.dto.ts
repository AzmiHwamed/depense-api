import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({ description: 'Synced SQL user record' })
  user: any; // replace `any` with your User entity type if you want stricter typing

  @ApiProperty({ example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...' })
  idToken: string;

  @ApiProperty({ example: 'AMf-vBy...' })
  refreshToken: string;
}