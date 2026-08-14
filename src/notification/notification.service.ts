import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import type { Messaging } from 'firebase-admin/messaging';

import { Notification, NotificationSource } from './entities/notification.entity';
import { DeviceToken } from './entities/device-token.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';
import { NOTIFICATION_EVENT, NotificationDispatchEvent } from './notification.events';
import { Country } from 'src/country/entities/country.entity';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepo: Repository<DeviceToken>,
    @InjectRepository(Country)
    private readonly countryRepo: Repository<Country>,
    @Inject('FIREBASE_MESSAGING')
    private readonly messaging: Messaging,
  ) {}

  async checkCurrentCountry(user: User, detectedCountryCode: string) {
    const detectedCountry = await this.countryRepo.findOne({
      where: { alpha2Code: detectedCountryCode.trim().toUpperCase(), isActive: true },
    });

    if (!detectedCountry) {
      throw new NotFoundException('Detected country is not available');
    }

    const declaredCountry = user.currentCountry;
    const matches =
      !!declaredCountry &&
      declaredCountry.alpha2Code.toUpperCase() === detectedCountry.alpha2Code.toUpperCase();

    if (matches) {
      return { matches: true, declaredCountry, detectedCountry, notification: null };
    }

    const title = 'Country change detected';
    const body = declaredCountry
      ? `We noticed you are not currently in ${declaredCountry.name}. Do you want to change it to ${detectedCountry.name}?`
      : `We noticed you are currently in ${detectedCountry.name}. Do you want to set it as your current country?`;

    const recent = await this.findRecentForUser(user.id, 20);
    const existing = recent.find(
      (item) =>
        item.data?.type === 'country_change_suggestion' &&
        item.data?.detectedCountryId === detectedCountry.id &&
        item.data?.declaredCountryId === (declaredCountry?.id ?? ''),
    );

    const notification =
      existing ??
      (await this.create(
        {
          userId: user.id,
          title,
          body,
          data: {
            type: 'country_change_suggestion',
            declaredCountryId: declaredCountry?.id ?? '',
            declaredCountryName: declaredCountry?.name ?? '',
            detectedCountryId: detectedCountry.id,
            detectedCountryName: detectedCountry.name,
            detectedCountryCode: detectedCountry.alpha2Code,
          },
          sendPush: true,
        },
        NotificationSource.EVENT,
      ));

    return { matches: false, declaredCountry, detectedCountry, notification };
  }

  // ---------- CRUD ----------

  async create(
    dto: CreateNotificationDto,
    source: NotificationSource = NotificationSource.MANUAL,
  ) {
    const notification = this.notificationRepo.create({
      userId: dto.userId ?? null,
      title: dto.title,
      body: dto.body,
      data: dto.data ?? null,
      source,
    });

    await this.notificationRepo.save(notification);

    if (dto.sendPush !== false) {
      try {
        const result = await this.pushToUserOrBroadcast(
          dto.userId,
          dto.title,
          dto.body,
          dto.data,
        );
        notification.pushSent = result.sent;
        await this.notificationRepo.save(notification);
      } catch (error) {
        // A temporary FCM outage must not discard the saved in-app notification
        // or make the action that triggered it fail.
        this.logger.error(
          `Push delivery failed for notification ${notification.id}: ${(error as Error).message}`,
          (error as Error).stack,
        );
      }
    }

    return notification;
  }

  async findAll(userId?: string) {
    return this.notificationRepo.find({
      where: userId ? { userId } : {},
      order: { createdAt: 'DESC' },
    });
  }

  async findRecentForUser(userId: string, limit = 50) {
    return this.notificationRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findOne(userId: string, id: string) {
    const notification = await this.notificationRepo.findOne({ where: { id, userId } });
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  async update(userId: string, id: string, dto: UpdateNotificationDto) {
    const notification = await this.findOne(userId, id);
    Object.assign(notification, dto);
    return this.notificationRepo.save(notification);
  }

  async markAsRead(userId: string, id: string) {
    return this.update(userId, id, { read: true });
  }

  async remove(userId: string, id: string) {
    const notification = await this.findOne(userId, id);
    return this.notificationRepo.remove(notification);
  }

  // ---------- Device tokens ----------

  async registerDeviceToken(dto: RegisterDeviceTokenDto & { userId: string }) {
    const existing = await this.deviceTokenRepo.findOne({ where: { token: dto.token } });
    if (existing) {
      existing.userId = dto.userId;
      existing.platform = dto.platform;
      return this.deviceTokenRepo.save(existing);
    }
    return this.deviceTokenRepo.save(this.deviceTokenRepo.create(dto));
  }

  async removeDeviceToken(userId: string, token: string) {
    await this.deviceTokenRepo.delete({ userId, token });
    return { removed: true };
  }

  // ---------- Event-based trigger ----------

  @OnEvent(NOTIFICATION_EVENT)
  async handleDispatchEvent(event: NotificationDispatchEvent) {
    try {
      await this.create(
        {
          userId: event.userId,
          title: event.title,
          body: event.body,
          data: event.data,
          sendPush: true,
        },
        NotificationSource.EVENT,
      );
    } catch (error) {
      this.logger.error(
        `Failed to persist dispatched notification: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  // ---------- Push sending ----------

  private async pushToUserOrBroadcast(
    userId: string | undefined,
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    const tokens = await this.deviceTokenRepo.find({
      where: userId ? { userId } : {},
      select: { token: true },
    });

    if (tokens.length === 0) {
      this.logger.warn(`No device tokens found${userId ? ` for user ${userId}` : ' (broadcast)'}`);
      return { sent: false, successCount: 0, failureCount: 0 };
    }

    const response = await this.messaging.sendEachForMulticast({
      tokens: tokens.map((t) => t.token),
      notification: { title, body },
      data,
    });

    // Prune tokens that FCM says are no longer valid (uninstalled app, etc.)
    const deadTokens: string[] = [];
    response.responses.forEach((r, i) => {
      if (!r.success && r.error?.code === 'messaging/registration-token-not-registered') {
        deadTokens.push(tokens[i].token);
      }
    });
    if (deadTokens.length) {
      await this.deviceTokenRepo.delete({ token: In(deadTokens) });
    }

    return {
      sent: response.successCount > 0,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  }
  async markAllAsRead(userId: string) {
    await this.notificationRepo.update({ userId, read: false }, { read: true });
    return { updated: true };
  }
}
