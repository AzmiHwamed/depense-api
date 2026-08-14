import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DevicePlatform } from '../entities/device-token.entity';

export class RegisterDeviceTokenDto {
  @ApiPropertyOptional({
    description: 'Set by the authenticated API endpoint; clients may omit it.',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty({ enum: DevicePlatform })
  @IsEnum(DevicePlatform)
  platform: DevicePlatform;
}
