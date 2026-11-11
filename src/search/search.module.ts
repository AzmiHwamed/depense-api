import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Receipt } from 'src/receipts/entities/receipt.entity';
import { Expense } from 'src/expense/entities/expense.entity';
import { Trip } from 'src/trip/entities/trip.entity';
import { UserModule } from 'src/user/user.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [TypeOrmModule.forFeature([Receipt, Expense, Trip]), UserModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
