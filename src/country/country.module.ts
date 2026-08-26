import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Country } from './entities/country.entity';
import { Currency } from '../currency/entities/currency.entity';
import { CountryService } from './country.service';
import { CountryController } from './country.controller';
import { CurrencyModule } from '../currency/currency.module';
import { TranslationModule } from 'src/translation/translation.module';
import { TranslationService } from 'src/translation/translation.service';
import { UserModule } from 'src/user/user.module';
import { Language } from '../language/entities/language.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Country, Currency, Language]),
    CurrencyModule,
    TranslationModule,
    UserModule,
  ],
  providers: [CountryService],
  controllers: [CountryController],
  exports: [CountryService],
})
export class CountryModule {}
