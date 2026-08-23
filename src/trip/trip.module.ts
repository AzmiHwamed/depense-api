import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CurrencyModule } from 'src/currency/currency.module';
import { Expense } from 'src/expense/entities/expense.entity';
import { ExpenseCategory } from 'src/expense-category/entities/expense-category.entity';
import { Country } from 'src/country/entities/country.entity';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { UserModule } from 'src/user/user.module';
import { Trip } from './entities/trip.entity';
import { TripController } from './trip.controller';
import { TripService } from './trip.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trip, Expense, ExpenseCategory, Country]),
    CurrencyModule,
    FirebaseModule,
    UserModule,
    HttpModule,
  ],
  controllers: [TripController],
  providers: [TripService],
  exports: [TripService],
})
export class TripModule {}
