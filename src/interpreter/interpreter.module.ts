import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { InterpreterConversation } from './entities/interpreter-conversation.entity';
import { InterpreterTurn } from './entities/interpreter-turn.entity';
import { InterpreterAiService } from './interpreter-ai.service';
import { InterpreterController } from './interpreter.controller';
import { InterpreterService } from './interpreter.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([InterpreterConversation, InterpreterTurn]),
    HttpModule,
    AuthModule,
    UserModule,
  ],
  controllers: [InterpreterController],
  providers: [InterpreterAiService, InterpreterService],
  exports: [InterpreterAiService],
})
export class InterpreterModule {}
