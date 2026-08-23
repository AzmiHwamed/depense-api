import { Module } from '@nestjs/common';
import { NotificationModule } from 'src/notification/notification.module';
import { UserModule } from 'src/user/user.module';
import { ExploreController } from './explore.controller';
import { ExploreService } from './explore.service';
import { GuestExploreController } from './guest-explore.controller';
import { InterpreterModule } from '../interpreter/interpreter.module';

@Module({
  imports: [NotificationModule, UserModule, InterpreterModule],
  controllers: [ExploreController, GuestExploreController],
  providers: [ExploreService],
})
export class ExploreModule {}
