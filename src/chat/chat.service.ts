import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message, SenderRole } from './entities/message.entity';
import { ChatRealtimeService } from './chat-realtime.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    private readonly realtime: ChatRealtimeService,
  ) {}

  async getOrCreateConversation(
    userId: string,
    userDisplayName?: string | null,
  ): Promise<Conversation> {
    let conversation = await this.conversationRepo.findOne({
      where: { userId },
    });

    let changed = false;

    if (!conversation) {
      conversation = await this.conversationRepo.save(
        this.conversationRepo.create({
          userId,
          userDisplayName: userDisplayName ?? null,
        }),
      );
      changed = true;
    } else if (
      userDisplayName &&
      conversation.userDisplayName !== userDisplayName
    ) {
      conversation.userDisplayName = userDisplayName;
      conversation = await this.conversationRepo.save(conversation);
      changed = true;
    }

    if (changed) {
      await this.realtime.mirrorConversation(conversation);
    }

    return conversation;
  }

  async listConversations(): Promise<Conversation[]> {
    return this.conversationRepo.find({
      order: { lastMessageAt: 'DESC', createdAt: 'DESC' },
    });
  }

  async findByIdOrThrow(conversationId: string): Promise<Conversation> {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    return conversation;
  }

  async assertUserOwnsConversation(
    conversationId: string,
    userId: string,
  ): Promise<Conversation> {
    const conversation = await this.findByIdOrThrow(conversationId);
    if (conversation.userId !== userId) {
      throw new ForbiddenException('You do not have access to this conversation');
    }
    return conversation;
  }

  async getMessages(
    conversationId: string,
    opts: { before?: Date; limit?: number } = {},
  ): Promise<Message[]> {
    const qb = this.messageRepo
      .createQueryBuilder('message')
      .where('message.conversationId = :conversationId', { conversationId });

    if (opts.before) {
      qb.andWhere('message.createdAt < :before', { before: opts.before });
    }

    qb.orderBy('message.createdAt', 'DESC').limit(opts.limit ?? 50);

    const messages = await qb.getMany();
    return messages.reverse(); // chronological order for the UI
  }

  /**
   * Persists the message in SQL, then mirrors both the message and the
   * updated conversation summary into Firebase Realtime Database so that
   * subscribed clients (admin dashboard + the sender's counterpart) get it
   * instantly without any WebSocket connection to our own server.
   */
  async postMessage(
    conversationId: string,
    senderId: string,
    senderRole: SenderRole,
    body: string,
  ): Promise<Message> {
    const conversation = await this.findByIdOrThrow(conversationId);

    const message = await this.messageRepo.save(
      this.messageRepo.create({ conversationId, senderId, senderRole, body }),
    );

    conversation.lastMessagePreview = body.slice(0, 200);
    conversation.lastMessageAt = message.createdAt;
    if (senderRole === 'user') {
      conversation.unreadByAdmin += 1;
    } else {
      conversation.unreadByUser += 1;
    }
    await this.conversationRepo.save(conversation);

    await this.realtime.mirrorMessage(message);
    await this.realtime.mirrorConversation(conversation);

    return message;
  }

  async markRead(conversationId: string, readerRole: SenderRole): Promise<void> {
    const conversation = await this.findByIdOrThrow(conversationId);
    const otherRole: SenderRole = readerRole === 'admin' ? 'user' : 'admin';

    await this.messageRepo.update(
      { conversationId, senderRole: otherRole, isRead: false },
      { isRead: true },
    );

    if (readerRole === 'admin') {
      conversation.unreadByAdmin = 0;
    } else {
      conversation.unreadByUser = 0;
    }
    await this.conversationRepo.save(conversation);

    await this.realtime.mirrorReadState(conversationId, readerRole, 0);
  }
}
