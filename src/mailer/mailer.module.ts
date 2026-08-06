import { Module } from '@nestjs/common';
import { MailerModule as NestMailerModule } from '@nestjs-modules/mailer';
import { MailerService } from './mailer.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    NestMailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get<string>('MAIL_HOST'),
          port: Number(config.get<string>('MAIL_PORT')),
          secure: config.get<string>('MAIL_SECURE') === 'true',

          auth: {
            user: config.get<string>('MAIL_USER'),
            pass: config.get<string>('MAIL_PASS'),
          },
        },

        defaults: {
          from: config.get<string>('MAIL_FROM_NAME'),
        },
      }),
    }),
  ],

  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}