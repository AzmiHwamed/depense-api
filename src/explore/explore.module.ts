import { Module } from '@nestjs/common';
import { NotificationModule } from 'src/notification/notification.module';
import { UserModule } from 'src/user/user.module';
import { ExploreController } from './explore.controller';
import { ExploreService } from './explore.service';

@Module({
  imports: [NotificationModule, UserModule],
  controllers: [ExploreController],
  providers: [ExploreService],
})
export class ExploreModule {}
