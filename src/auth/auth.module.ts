import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { UserModule } from 'src/user/user.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';

@Module({
  imports: [UserModule, MailerModule, TypeOrmModule.forFeature([User]),
  ],
  controllers: [AuthController],
  providers: [AuthService, FirebaseAuthGuard],
  exports: [FirebaseAuthGuard],
})
export class AuthModule { }