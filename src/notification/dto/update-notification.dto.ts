import { PartialType, OmitType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateNotificationDto } from './create-notification.dto';

export class UpdateNotificationDto extends PartialType(
  OmitType(CreateNotificationDto, ['sendPush'] as const),
) {
  @IsOptional()
  @IsBoolean()
  read?: boolean;
}