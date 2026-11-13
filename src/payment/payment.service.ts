// src/payment/payment.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Payment,
  PaymentProvider,
  PaymentStatus,
} from './entities/payment.entity';
import { PaymentPlan } from './entities/payment-plan.entity';
import { KonnectService } from './providers/konnect.service';
import { MoyasarService } from './providers/moyasar.service';
import { IPaymentProviderStrategy } from './providers/payment-provider.interface';
import { UsersService } from 'src/user/user.service';
import { CurrencyService } from 'src/currency/currency.service';
import { User } from 'src/user/entities/user.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NOTIFICATION_EVENT,
  NotificationDispatchEvent,
} from 'src/notification/notification.events';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(PaymentPlan)
    private readonly planRepo: Repository<PaymentPlan>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly konnectService: KonnectService,
    private readonly moyasarService: MoyasarService,
    private readonly userService: UsersService,
    private readonly currencyService: CurrencyService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private resolveProvider(currencyCode: string): {
    provider: PaymentProvider;
    strategy: IPaymentProviderStrategy;
  } {
    if (currencyCode === 'TND') {
      return {
        provider: PaymentProvider.KONNECT,
        strategy: this.konnectService,
      };
    }
    if (currencyCode === 'SAR' || currencyCode === 'USD') {
      return {
        provider: PaymentProvider.MOYASSER,
        strategy: this.moyasarService,
      };
    }
    throw new BadRequestException(
      `No payment provider supports currency ${currencyCode}`,
    );
  }

  async initiatePayment(userId: string, planId: string) {
    const plan = await this.planRepo.findOne({
      where: { id: planId },
      relations: { baseCurrency: true },
    });
    if (!plan || !plan.isActive) {
      throw new NotFoundException('Payment plan not found or inactive');
    }

    // user.currency is eager-loaded on the entity, so this already has it
    const user = await this.userService.findOne(userId);

    if (!user.currency) {
      throw new BadRequestException('User has no base currency configured');
    }

    // Provider routing is deliberately limited: Tunisian dinars go through
    // Konnect, Saudi riyals through Moyasar, and every other locale checks
    // out with Moyasar in USD.
    const checkoutCurrency =
      user.currency.code === 'TND' || user.currency.code === 'SAR'
        ? user.currency
        : await this.currencyService.findByCode('USD');
    const amountInCheckoutCurrency =
      plan.baseCurrencyId === checkoutCurrency.id
        ? Number(plan.basePrice)
        : (
            await this.currencyService.convert(
              plan.basePrice,
              plan.baseCurrencyId,
              checkoutCurrency.id,
            )
          ).convertedAmount;

    const { provider, strategy } = this.resolveProvider(checkoutCurrency.code);

    const payment = this.paymentRepo.create({
      userId: user.id,
      paymentPlanId: plan.id,
      tokenCount: Number(plan.tokenCount),
      amount: amountInCheckoutCurrency,
      currencyId: checkoutCurrency.id,
      status: PaymentStatus.PENDING,
      provider,
    });
    await this.paymentRepo.save(payment);

    // User only has displayName, not separate first/last name fields
    const [firstName, ...rest] = (user.displayName ?? '').trim().split(' ');
    const lastName = rest.join(' ');

    let result;
    try {
      result = await strategy.initPayment({
        paymentId: payment.id,
        amount: amountInCheckoutCurrency,
        currencyCode: checkoutCurrency.code,
        description: `Payment for ${plan.name}`,
        customerEmail: user.email,
        customerFirstName: firstName || undefined,
        customerLastName: lastName || undefined,
      });
    } catch (error) {
      payment.status = PaymentStatus.FAILED;
      await this.paymentRepo.save(payment);
      throw error;
    }

    if (!result.providerTransactionId || !result.checkoutUrl) {
      payment.status = PaymentStatus.FAILED;
      await this.paymentRepo.save(payment);
      throw new InternalServerErrorException(
        'Payment provider returned an invalid checkout response',
      );
    }

    payment.providerTransactionId = result.providerTransactionId;
    await this.paymentRepo.save(payment);

    return { paymentId: payment.id, checkoutUrl: result.checkoutUrl };
  }

  async handleWebhook(provider: PaymentProvider, paymentReference: string) {
    if (!paymentReference) {
      throw new BadRequestException('Missing payment reference');
    }

    const strategy =
      provider === PaymentProvider.KONNECT
        ? this.konnectService
        : provider === PaymentProvider.MOYASSER
          ? this.moyasarService
          : null;
    if (!strategy) {
      throw new BadRequestException(
        `Unsupported payment provider: ${provider}`,
      );
    }

    // Moyasar callbacks contain our payment UUID, while Konnect sends its own
    // payment_ref. Supporting both identifiers also makes retries/debugging safe.
    const payment = await this.paymentRepo.findOne({
      where: [
        { id: paymentReference, provider },
        { providerTransactionId: paymentReference, provider },
      ],
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Idempotency guard: this payment has already been finalized,
    // don't let a retried/duplicate webhook process it again.
    if (
      payment.status === PaymentStatus.SUCCEEDED ||
      payment.status === PaymentStatus.FAILED
    ) {
      return payment;
    }

    const verification = await strategy.verifyPayment(
      payment.providerTransactionId,
    );

    const newStatus =
      verification.status === 'succeeded'
        ? PaymentStatus.SUCCEEDED
        : verification.status === 'failed'
          ? PaymentStatus.FAILED
          : PaymentStatus.PENDING;

    const outcome = await this.paymentRepo.manager.transaction(
      async (manager) => {
        const lockedPayment = await manager.findOne(Payment, {
          where: { id: payment.id },
          relations: { plan: true },
          lock: { mode: 'pessimistic_write' },
        });
        if (!lockedPayment) throw new NotFoundException('Payment not found');

        // A concurrent/retried webhook may have completed while verification ran.
        if (
          lockedPayment.status === PaymentStatus.SUCCEEDED ||
          lockedPayment.status === PaymentStatus.FAILED
        ) {
          return { payment: lockedPayment, activated: false };
        }

        lockedPayment.status = newStatus;
        if (newStatus === PaymentStatus.SUCCEEDED) {
          const user = await manager.findOne(User, {
            where: { id: lockedPayment.userId },
            lock: { mode: 'pessimistic_write' },
          });
          if (!user) throw new NotFoundException('Payment user not found');

          // Credit the checkout snapshot, not the live package. Admins can
          // safely change a deal while a customer is completing payment. The
          // fallback supports a pending checkout started immediately before the
          // snapshot migration was deployed.
          const purchasedTokens =
            Number(lockedPayment.tokenCount) ||
            Number(lockedPayment.plan?.tokenCount);
          lockedPayment.tokenCount = purchasedTokens;
          user.tokenBalance = Number(user.tokenBalance ?? 0) + purchasedTokens;
          await manager.save(User, user);
        }

        const savedPayment = await manager.save(Payment, lockedPayment);
        return {
          payment: savedPayment,
          activated: newStatus === PaymentStatus.SUCCEEDED,
        };
      },
    );

    if (outcome.activated) {
      this.eventEmitter.emit(
        NOTIFICATION_EVENT,
        new NotificationDispatchEvent(
          'Payment successful',
          `${outcome.payment.tokenCount} AI tokens were added to your wallet`,
          outcome.payment.userId,
          {
            type: 'payment.succeeded',
            paymentId: outcome.payment.id,
            planId: outcome.payment.paymentPlanId,
          },
        ),
      );
    }

    return outcome.payment;
  }

  async verifyUserPayment(userId: string, paymentId: string) {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId, userId },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    return this.handleWebhook(payment.provider, payment.id);
  }
}
