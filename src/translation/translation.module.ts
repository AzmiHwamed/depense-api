import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

import { TranslationController } from './translation.controller';
import { TranslationService } from './translation.service';
import { UserModule } from 'src/user/user.module';
import { TranslateInterceptor } from './translate.interceptor';
import { GuestTranslationController } from './guest-translation.controller';


@Global()
@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 500000,
      maxRedirects: 5,
    }),
    UserModule
  ],
  controllers: [TranslationController, GuestTranslationController],
  providers: [TranslationService , TranslateInterceptor],
  exports: [TranslationService,TranslateInterceptor],
})
export class TranslationModule {}
