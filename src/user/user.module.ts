import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Country } from '../country/entities/country.entity';
import { Payment } from '../payment/entities/payment.entity';
import { UsersService } from './user.service';
import { UserController } from './user.controller';
import { AdminUserController } from './admin-user.controller';
import { AdminStatsService } from './admin-stats.service';
import { AdminStatsController } from './admin-stats.controller';
import { AdminBootstrapService } from './admin-bootstrap.service';
import { TokenWalletService } from './token-wallet.service';
import { CurrencyModule } from '../currency/currency.module';
import { CountryModule } from '../country/country.module';
import { LanguageModule } from 'src/language/language.module';
import { LanguageService } from 'src/language/language.service';
import { CountryService } from 'src/country/country.service';
import { Language } from 'src/language/entities/language.entity';
import { AiServicePrice } from './entities/ai-service-price.entity';
import { AdminAiServicePriceController } from './admin-ai-service-price.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Country, Payment, Language, AiServicePrice]),
    CurrencyModule,
  ],
  controllers: [UserController, AdminUserController, AdminStatsController, AdminAiServicePriceController],
  providers: [UsersService, AdminStatsService, AdminBootstrapService, TokenWalletService],
  exports: [UsersService, TokenWalletService],
})
export class UserModule {}
