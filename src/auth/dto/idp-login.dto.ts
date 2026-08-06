import { IsIn, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IdpLoginDto {
  @ApiProperty({
    enum: ['google.com', 'facebook.com'],
    example: 'google.com',
    description: 'OAuth provider identifier',
  })
  @IsIn(['google.com', 'facebook.com'])
  provider: 'google.com' | 'facebook.com';

  @ApiProperty({
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...',
    description: 'ID token (Google) or access token (Facebook) obtained client-side from the provider SDK',
  })
  @IsString()
  token: string;
}