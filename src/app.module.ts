import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FirebaseModule } from './firebase/firebase.module';
import { AuthModule } from './auth/auth.module';
import { User } from './user/entities/user.entity';
import { UserModule } from './user/user.module';
import { CurrencyModule } from './currency/currency.module';
import { CountryModule } from './country/country.module';
import { PaymentModule } from './payment/payment.module';
import { PaymentPlanModule } from './payment/payment-plan.module';
import { ExpenseCategoryModule } from './expense-category/expense-category.module';
import { ExpenseModule } from './expense/expense.module';
import { FaqModule } from './faq/faq.module';
import { ChatModule } from './chat/chat.module';
import { CacheModule } from '@nestjs/cache-manager';
import { MailerModule } from './mailer/mailer.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { LanguageModule } from './language/language.module';
import { NotificationModule } from './notification/notification.module';
import { TranslationModule } from './translation/translation.module';
import { ResponseFormatInterceptor } from './common/decorators/response-format.interceptor';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ReceiptsModule } from './receipts/receipts.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { InterpreterModule } from './interpreter/interpreter.module';
import { ExploreModule } from './explore/explore.module';
@Module({
  imports: [
    EventEmitterModule.forRoot(),

    ConfigModule.forRoot({
      isGlobal: true, // available everywhere without re-importing
      envFilePath: '.env',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'files'),
      serveRoot: '/files',
    }),
    CacheModule.register({
      ttl: 300,
      max: 100,
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: config.get<string>('DB_TYPE') as 'mysql',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        entities: [User],
        synchronize: config.get<string>('NODE_ENV') !== 'production', // true only in dev
        autoLoadEntities: true,
      }),
    }),

    FirebaseModule,
    UserModule,
    AuthModule,
    CurrencyModule,
    CountryModule,
    PaymentModule,
    PaymentPlanModule,
    ExpenseCategoryModule,
    ExpenseModule,
    FaqModule,
    ChatModule,

    MailerModule,

    LanguageModule,

    NotificationModule,

    TranslationModule,

    ReceiptsModule,
    InterpreterModule,
    ExploreModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseFormatInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule { }
