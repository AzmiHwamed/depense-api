// src/payment/providers/payment-provider.interface.ts
export interface InitPaymentParams {
  paymentId: string;
  amount: number; // major unit, e.g. 49.900
  currencyCode: string; // ISO code: TND, SAR, USD, ...
  description: string;
  customerEmail?: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerPhone?: string;
}

export interface InitPaymentResult {
  providerTransactionId: string;
  checkoutUrl: string;
  raw: Record<string, any>;
}

export interface VerifyPaymentResult {
  status: 'pending' | 'succeeded' | 'failed';
  raw: Record<string, any>;
}

export interface IPaymentProviderStrategy {
  initPayment(params: InitPaymentParams): Promise<InitPaymentResult>;
  verifyPayment(providerTransactionId: string): Promise<VerifyPaymentResult>;
}
