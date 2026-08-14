import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CurrencyService } from './currency.service';
import { CurrencyController } from './currency.controller';
import { Currency } from './entities/currency.entity';
import { UsersService } from 'src/user/user.service';
import { User } from 'src/user/entities/user.entity';
import { Language } from 'src/language/entities/language.entity';
import { Country } from 'src/country/entities/country.entity';
import { Payment } from 'src/payment/entities/payment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Currency, User, Country, Language, Payment])],
  providers: [CurrencyService , UsersService],
  controllers: [CurrencyController],
  exports: [CurrencyService],
})
export class CurrencyModule {}
