import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { KonnectService } from './providers/konnect.service';
import { MoyasarService } from './providers/moyasar.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { Currency } from 'src/currency/entities/currency.entity';
import { User } from 'src/user/entities/user.entity';
import { CurrencyModule } from 'src/currency/currency.module';
import { UserModule } from 'src/user/user.module';
import { PaymentPlan } from './entities/payment-plan.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Currency, User, PaymentPlan]),
    CurrencyModule,
    UserModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService, KonnectService, MoyasarService],
})
export class PaymentModule {}
