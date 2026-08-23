import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Receipt } from './entities/receipt.entity';
import { ReceiptItem } from './entities/receipt-item.entity';
import { ReceiptExtractionService } from './receipt-extraction.service';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';
import { UserModule } from 'src/user/user.module';
import { CurrencyModule } from 'src/currency/currency.module';
import { ExpenseCategory } from 'src/expense-category/entities/expense-category.entity';
import { MerchantMatchService } from './merchant-match.service';
import { GuestReceiptsController } from './guest-receipts.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Receipt, ReceiptItem, ExpenseCategory]),
    HttpModule.register({ timeout: 100000 }),
    UserModule,
    CurrencyModule,
  ],
  controllers: [ReceiptsController, GuestReceiptsController],
  providers: [ReceiptsService, ReceiptExtractionService, MerchantMatchService],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}
