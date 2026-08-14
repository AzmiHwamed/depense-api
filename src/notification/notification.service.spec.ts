import { NotificationService } from './notification.service';
import { NotificationSource } from './entities/notification.entity';

describe('NotificationService', () => {
  const notificationRepo: any = {
    create: jest.fn((value) => ({ id: 'notification-id', pushSent: false, ...value })),
    save: jest.fn((value) => Promise.resolve(value)),
  };
  const deviceTokenRepo: any = {
    find: jest.fn(),
    delete: jest.fn(),
  };
  const messaging: any = { sendEachForMulticast: jest.fn() };
  const service = new NotificationService(
    notificationRepo,
    deviceTokenRepo,
    messaging,
  );

  beforeEach(() => jest.clearAllMocks());

  it('persists an event notification and sends it to the user devices', async () => {
    deviceTokenRepo.find.mockResolvedValue([{ token: 'device-token' }]);
    messaging.sendEachForMulticast.mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true }],
    });

    const result = await service.create(
      {
        userId: 'user-id',
        title: 'Expense added',
        body: 'Your expense was saved',
        data: { type: 'expense.created' },
      },
      NotificationSource.EVENT,
    );

    expect(notificationRepo.save).toHaveBeenCalled();
    expect(messaging.sendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({ tokens: ['device-token'] }),
    );
    expect(result.pushSent).toBe(true);
  });

  it('keeps the saved notification when FCM delivery fails', async () => {
    deviceTokenRepo.find.mockResolvedValue([{ token: 'device-token' }]);
    messaging.sendEachForMulticast.mockRejectedValue(new Error('FCM unavailable'));

    await expect(
      service.create({
        userId: 'user-id',
        title: 'Receipt extracted',
        body: 'Receipt ready',
      }),
    ).resolves.toEqual(expect.objectContaining({ id: 'notification-id' }));

    expect(notificationRepo.save).toHaveBeenCalledTimes(1);
  });
});
