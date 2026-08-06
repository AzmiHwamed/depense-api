import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatRealtimeService } from './chat-realtime.service';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message]), UserModule],
  controllers: [ChatController],
  providers: [ChatService, ChatRealtimeService],
  exports: [ChatService],
})
export class ChatModule {}
