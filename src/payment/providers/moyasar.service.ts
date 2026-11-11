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
  private readonly callbackUrl: string;
  private readonly successUrl: string;

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
    this.baseUrl = this.requiredUrl('MOYASAR_BASE_URL');
    this.secretKey = this.requiredSecretKey();
    const appBaseUrl = this.requiredUrl('APP_BASE_URL');

    // Invoices use two different URLs. callback_url is a POST notification to
    // our backend, while success_url is the browser redirect after payment.
    this.callbackUrl =
      this.optionalUrl('MOYASAR_CALLBACK_URL') ??
      `${appBaseUrl}/payment/webhook/moyasar`;
    this.successUrl =
      this.optionalUrl('MOYASAR_RETURN_URL') ??
      `${appBaseUrl}/payment-result`;
  }

  private optionalUrl(
    name: 'MOYASAR_CALLBACK_URL' | 'MOYASAR_RETURN_URL',
  ): string | null {
    const value = this.config.get<string>(name)?.trim();
    if (!value) return null;

    return this.validateUrl(name, value);
  }

  private requiredUrl(name: 'MOYASAR_BASE_URL' | 'APP_BASE_URL'): string {
    const value = this.config.get<string>(name)?.trim();
    if (!value) throw new Error(`${name} must be configured before starting payments`);

    return this.validateUrl(name, value);
  }

  private validateUrl(name: string, value: string): string {
    try {
      const url = new URL(value);
      const isLocalDevelopmentUrl =
        url.protocol === 'http:' &&
        ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
      if (
        url.protocol !== 'https:' &&
        !(name === 'APP_BASE_URL' && url.protocol === 'http:') &&
        !isLocalDevelopmentUrl
      ) {
        throw new Error('unsupported protocol');
      }
    } catch {
      throw new Error(`${name} must be a valid URL`);
    }

    return value.replace(/\/$/, '');
  }

  private requiredSecretKey(): string {
    const value = this.config.get<string>('MOYASAR_SECRET_KEY')?.trim();
    if (!value) {
      throw new Error('MOYASAR_SECRET_KEY must be configured before starting payments');
    }
    if (!/^sk_(test|live)_/.test(value)) {
      throw new Error('MOYASAR_SECRET_KEY must be a Moyasar secret key (sk_test_ or sk_live_)');
    }
    return value;
  }

  private authHeader(): string {
    return 'Basic ' + Buffer.from(`${this.secretKey}:`).toString('base64');
  }

  private moyasarRequestError(operation: string, status: number, body: string): Error {
    if (status === 401) {
      const mode = this.secretKey.startsWith('sk_live_') ? 'live' : 'test';
      return new InternalServerErrorException(
        `Moyasar rejected MOYASAR_SECRET_KEY (${mode} mode) while trying to ${operation}. ` +
          'Verify that the deployed backend has the complete, active secret key for this Moyasar account. ' +
          'Use an sk_ key, not the pk_ publishable key, then restart the service.',
      );
    }

    return new InternalServerErrorException(
      `Moyasar ${operation} failed (HTTP ${status}): ${body}`,
    );
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
      callback_url: this.callbackUrlWithPaymentId(params.paymentId),
      success_url: this.successUrlWithPaymentId(params.paymentId),
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
      throw this.moyasarRequestError('create invoice', res.status, await res.text());
    }

    const data = await res.json();
    return { providerTransactionId: data.id, checkoutUrl: data.url, raw: data };
  }

  private callbackUrlWithPaymentId(paymentId: string): string {
    return this.urlWithPaymentId(this.callbackUrl, paymentId);
  }

  private successUrlWithPaymentId(paymentId: string): string {
    return this.urlWithPaymentId(this.successUrl, paymentId);
  }

  private urlWithPaymentId(baseUrl: string, paymentId: string): string {
    const url = new URL(baseUrl);
    url.searchParams.set('paymentId', paymentId);
    return url.toString();
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
      throw this.moyasarRequestError('get invoice', res.status, await res.text());
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
