import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentProvider } from './entities/payment.entity';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('checkout/:planId')
  @ApiBearerAuth()
  @UseGuards(FirebaseAuthGuard)
  initiateCheckout(@Param('planId') planId: string, @Req() req) {
    return this.paymentService.initiatePayment(req.user.id, planId);
  }

  // Konnect calls this with a GET request, appending payment_ref as a query param
  @Get('webhook/konnect')
  @ApiBearerAuth()
  konnectWebhook(@Query('payment_ref') paymentRef: string) {
    return this.paymentService.handleWebhook(
      PaymentProvider.KONNECT,
      paymentRef,
    );
  }

  // Moyasar posts the invoice/payment object to callback_url
  @Post('webhook/moyasar')
  @ApiBearerAuth()
  moyasarWebhook(@Query('paymentId') paymentId: string) {
    return this.paymentService.handleWebhook(
      PaymentProvider.MOYASSER,
      paymentId,
    );
  }
}
