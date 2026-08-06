import { Module } from '@nestjs/common';
import { PaymentPlanController } from './payment-plan.controller';
import { PaymentPlanService } from './payment-plan.service.spec';
import { PaymentPlan } from './entities/payment-plan.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CurrencyModule } from 'src/currency/currency.module';
import { Currency } from 'src/currency/entities/currency.entity';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentPlan, Currency]),
    CurrencyModule,
    UserModule,
  ],
  controllers: [PaymentPlanController],
  providers: [PaymentPlanService],
})
export class PaymentPlanModule {}
