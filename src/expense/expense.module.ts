import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from './entities/expense.entity';
import { ExpenseCategory } from 'src/expense-category/entities/expense-category.entity';
import { ExpenseService } from './expense.service';
import { ExpenseController } from './expense.controller';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { UserModule } from 'src/user/user.module';
import { User } from 'src/user/entities/user.entity';
import { Receipt } from 'src/receipts/entities/receipt.entity';
import { CurrencyModule } from 'src/currency/currency.module';
import { Trip } from 'src/trip/entities/trip.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Expense, ExpenseCategory, Receipt, User, Trip]),
    FirebaseModule,
    UserModule,
    CurrencyModule,
  ],
  controllers: [ExpenseController],
  providers: [ExpenseService],
  exports: [ExpenseService, TypeOrmModule],
})
export class ExpenseModule {}
