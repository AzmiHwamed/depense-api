jest.mock('src/user/user.service', () => ({ UsersService: class {} }));

import { PaymentService } from './payment.service';
import {
  Payment,
  PaymentProvider,
  PaymentStatus,
} from './entities/payment.entity';
import { SubscriptionStatus, User } from '../user/entities/user.entity';

describe('PaymentService', () => {
  const paymentRepo: any = {
    findOne: jest.fn(),
    save: jest.fn(),
    manager: { transaction: jest.fn() },
  };
  const planRepo: any = {};
  const userRepo: any = {};
  const konnectService: any = { verifyPayment: jest.fn() };
  const moyasarService: any = { verifyPayment: jest.fn() };
  const usersService: any = {};
  const currencyService: any = {};

  const service = new PaymentService(
    paymentRepo,
    planRepo,
    userRepo,
    konnectService,
    moyasarService,
    usersService,
    currencyService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('finds a Konnect callback by provider reference and activates the user', async () => {
    const payment: any = {
      id: 'internal-id',
      userId: 'user-id',
      provider: PaymentProvider.KONNECT,
      providerTransactionId: 'konnect-ref',
      status: PaymentStatus.PENDING,
      plan: { durationMonths: 3 },
    };
    const user: any = {
      id: 'user-id',
      subscriptionStatus: SubscriptionStatus.TRIAL,
      subscriptionEndsAt: null,
    };
    paymentRepo.findOne.mockResolvedValue(payment);
    konnectService.verifyPayment.mockResolvedValue({ status: 'succeeded' });

    const manager: any = {
      findOne: jest
        .fn()
        .mockImplementation((entity) =>
          Promise.resolve(entity === Payment ? payment : user),
        ),
      save: jest.fn().mockImplementation((_entity, value) => value),
    };
    paymentRepo.manager.transaction.mockImplementation((work) => work(manager));

    const result = await service.handleWebhook(
      PaymentProvider.KONNECT,
      'konnect-ref',
    );

    expect(paymentRepo.findOne).toHaveBeenCalledWith({
      where: [
        { id: 'konnect-ref', provider: PaymentProvider.KONNECT },
        {
          providerTransactionId: 'konnect-ref',
          provider: PaymentProvider.KONNECT,
        },
      ],
    });
    expect(konnectService.verifyPayment).toHaveBeenCalledWith('konnect-ref');
    expect(user.subscriptionStatus).toBe(SubscriptionStatus.ACTIVE);
    expect(user.subscriptionEndsAt).toBeInstanceOf(Date);
    expect(result.status).toBe(PaymentStatus.SUCCEEDED);
    expect(manager.save).toHaveBeenCalledWith(User, user);
  });

  it('does not process an already successful payment again', async () => {
    const payment: any = {
      status: PaymentStatus.SUCCEEDED,
      provider: PaymentProvider.MOYASSER,
    };
    paymentRepo.findOne.mockResolvedValue(payment);

    await expect(
      service.handleWebhook(PaymentProvider.MOYASSER, 'internal-id'),
    ).resolves.toBe(payment);
    expect(moyasarService.verifyPayment).not.toHaveBeenCalled();
    expect(paymentRepo.manager.transaction).not.toHaveBeenCalled();
  });

  it('keeps a pending provider result pending without updating the user', async () => {
    const payment: any = {
      id: 'internal-id',
      userId: 'user-id',
      providerTransactionId: 'invoice-id',
      status: PaymentStatus.PENDING,
      plan: { durationMonths: 1 },
    };
    paymentRepo.findOne.mockResolvedValue(payment);
    moyasarService.verifyPayment.mockResolvedValue({ status: 'pending' });
    const manager: any = {
      findOne: jest.fn().mockResolvedValue(payment),
      save: jest.fn().mockImplementation((_entity, value) => value),
    };
    paymentRepo.manager.transaction.mockImplementation((work) => work(manager));

    await service.handleWebhook(PaymentProvider.MOYASSER, 'internal-id');

    expect(payment.status).toBe(PaymentStatus.PENDING);
    expect(manager.findOne).toHaveBeenCalledTimes(1);
    expect(manager.save).not.toHaveBeenCalledWith(User, expect.anything());
  });
});
