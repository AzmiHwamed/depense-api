// src/payment/providers/konnect.service.ts
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IPaymentProviderStrategy,
  InitPaymentParams,
  InitPaymentResult,
  VerifyPaymentResult,
} from './payment-provider.interface';

@Injectable()
export class KonnectService implements IPaymentProviderStrategy {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly receiverWalletId: string;
  private readonly appBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('KONNECT_BASE_URL')!!; // https://api.preprod.konnect.network/api/v2
    this.apiKey = this.config.get<string>('KONNECT_API_KEY')!!;
    this.receiverWalletId = this.config.get<string>(
      'KONNECT_RECEIVER_WALLET_ID',
    )!!;
    this.appBaseUrl = this.config.get<string>('APP_BASE_URL')!!;
  }

  async initPayment(params: InitPaymentParams): Promise<InitPaymentResult> {
    if (params.currencyCode !== 'TND') {
      throw new BadRequestException('Konnect only supports payments in TND');
    }

    // Konnect amount is in millimes (1 TND = 1000 millimes)
    const amountInMillimes = Math.round(params.amount * 1000);

    const payload = {
      receiverWalletId: this.receiverWalletId,
      token: 'TND',
      amount: amountInMillimes,
      type: 'immediate',
      description: params.description,
      acceptedPaymentMethods: ['wallet', 'bank_card', 'e-DINAR'],
      lifespan: 30, // minutes
      checkoutForm: true,
      firstName: params.customerFirstName ?? 'N/A',
      lastName: params.customerLastName ?? 'N/A',
      email: params.customerEmail,
      phoneNumber: params.customerPhone,
      orderId: params.paymentId,
      webhook: `${this.appBaseUrl}/payment/webhook/konnect`,
      successUrl: `${this.appBaseUrl}/payment/success`,
      failUrl: `${this.appBaseUrl}/payment/failure`,
    };

    const res = await fetch(`${this.baseUrl}/payments/init-payment`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey, // confirm header name against your Konnect dashboard docs
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.log(res);
      throw new InternalServerErrorException(
        `Konnect init payment failed: ${await res.text()}`,
      );
    }

    const data = await res.json();
    return {
      providerTransactionId: data.paymentRef,
      checkoutUrl: data.payUrl,
      raw: data,
    };
  }

  async verifyPayment(
    providerTransactionId: string,
  ): Promise<VerifyPaymentResult> {
    const res = await fetch(
      `${this.baseUrl}/payments/${providerTransactionId}`,
      {
        headers: { 'x-api-key': this.apiKey },
      },
    );

    if (!res.ok) {
      throw new InternalServerErrorException(
        `Konnect get payment failed: ${await res.text()}`,
      );
    }

    const data = await res.json();
    const konnectStatus = data.payment?.status;
    const status =
      konnectStatus === 'completed'
        ? 'succeeded'
        : konnectStatus === 'failed'
          ? 'failed'
          : 'pending';

    return { status, raw: data };
  }
}
