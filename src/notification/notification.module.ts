import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Notification } from './entities/notification.entity';
import { DeviceToken } from './entities/device-token.entity';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, DeviceToken]), UserModule],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}