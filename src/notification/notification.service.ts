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

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepo: Repository<DeviceToken>,
    @Inject('FIREBASE_MESSAGING')
    private readonly messaging: Messaging,
  ) {}

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
      const result = await this.pushToUserOrBroadcast(dto.userId, dto.title, dto.body, dto.data);
      notification.pushSent = result.sent;
      await this.notificationRepo.save(notification);
    }

    return notification;
  }

  async findAll(userId?: string) {
    return this.notificationRepo.find({
      where: userId ? { userId } : {},
      order: { createdAt: 'DESC' },
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

  async registerDeviceToken(dto: RegisterDeviceTokenDto) {
    const existing = await this.deviceTokenRepo.findOne({ where: { token: dto.token } });
    if (existing) {
      existing.userId = dto.userId;
      existing.platform = dto.platform;
      return this.deviceTokenRepo.save(existing);
    }
    return this.deviceTokenRepo.save(this.deviceTokenRepo.create(dto));
  }

  async removeDeviceToken(token: string) {
    await this.deviceTokenRepo.delete({ token });
    return { removed: true };
  }

  // ---------- Event-based trigger ----------

  @OnEvent(NOTIFICATION_EVENT)
  async handleDispatchEvent(event: NotificationDispatchEvent) {
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