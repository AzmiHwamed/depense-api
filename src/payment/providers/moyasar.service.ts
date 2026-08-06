// src/payment/providers/moyasar.service.ts
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
export class MoyasarService implements IPaymentProviderStrategy {
  private readonly baseUrl: string;
  private readonly secretKey: string;
  private readonly appBaseUrl: string;

  private readonly supportedCurrencies = [
    'SAR',
    'USD',
    'AED',
    'EUR',
    'KWD',
    'BHD',
    'OMR',
  ];
  // KWD/BHD/OMR use 3 fractional digits, most others use 2
  private readonly minorUnitMultiplier: Record<string, number> = {
    SAR: 100,
    USD: 100,
    AED: 100,
    EUR: 100,
    KWD: 1000,
    BHD: 1000,
    OMR: 1000,
  };

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('MOYASAR_BASE_URL')!!; // https://api.moyasar.com/v1
    this.secretKey = this.config.get<string>('MOYASAR_SECRET_KEY')!!; // sk_test_...
    this.appBaseUrl = this.config.get<string>('APP_BASE_URL')!!;
  }

  private authHeader(): string {
    return 'Basic ' + Buffer.from(`${this.secretKey}:`).toString('base64');
  }

  async initPayment(params: InitPaymentParams): Promise<InitPaymentResult> {
    if (!this.supportedCurrencies.includes(params.currencyCode)) {
      throw new BadRequestException(
        `Moyasar does not support ${params.currencyCode}`,
      );
    }

    const multiplier = this.minorUnitMultiplier[params.currencyCode] ?? 100;
    const amountInMinorUnits = Math.round(params.amount * multiplier);

    const payload = {
      amount: amountInMinorUnits,
      currency: params.currencyCode,
      description: params.description,
      callback_url: `${this.appBaseUrl}/payment/webhook/moyasar?paymentId=${params.paymentId}`,
      metadata: { paymentId: params.paymentId },
    };

    const res = await fetch(`${this.baseUrl}/invoices`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new InternalServerErrorException(
        `Moyasar create invoice failed: ${await res.text()}`,
      );
    }

    const data = await res.json();
    return { providerTransactionId: data.id, checkoutUrl: data.url, raw: data };
  }

  async verifyPayment(
    providerTransactionId: string,
  ): Promise<VerifyPaymentResult> {
    const res = await fetch(
      `${this.baseUrl}/invoices/${providerTransactionId}`,
      {
        headers: { Authorization: this.authHeader() },
      },
    );

    if (!res.ok) {
      throw new InternalServerErrorException(
        `Moyasar get invoice failed: ${await res.text()}`,
      );
    }

    const data = await res.json();
    const status =
      data.status === 'paid'
        ? 'succeeded'
        : ['failed', 'canceled'].includes(data.status)
          ? 'failed'
          : 'pending';

    return { status, raw: data };
  }
}
