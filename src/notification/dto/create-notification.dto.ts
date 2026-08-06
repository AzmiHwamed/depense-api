import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateNotificationDto {
  @ApiPropertyOptional({ description: 'Target user id. Omit to broadcast to all devices.' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  body: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  data?: Record<string, string>;

  @ApiPropertyOptional({ default: true, description: 'Push immediately on create' })
  @IsOptional()
  @IsBoolean()
  sendPush?: boolean = true;
}