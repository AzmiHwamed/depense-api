import { Inject, Injectable, Logger } from '@nestjs/common';
import { Database } from 'firebase-admin/database';
import { Conversation } from './entities/conversation.entity';
import { Message, SenderRole } from './entities/message.entity';

/**
 * Mirrors chat state into Firebase Realtime Database so that both the admin
 * dashboard and the user app can subscribe to live updates with the Firebase
 * client SDK (no WebSocket server of our own to maintain).
 *
 * SQL (via TypeORM) stays the source of truth — every write here happens
 * *after* the SQL write has already succeeded, and only ever from server code.
 * Clients only ever *read* from Realtime Database (see firebase-database.rules.json).
 */
@Injectable()
export class ChatRealtimeService {
  private readonly logger = new Logger(ChatRealtimeService.name);

  constructor(@Inject('FIREBASE_DB') private readonly db: Database) {}

  private conversationRef(conversationId: string) {
    return this.db.ref(`chats/conversations/${conversationId}`);
  }

  private messagesRef(conversationId: string) {
    return this.db.ref(`chats/messages/${conversationId}`);
  }

  private userIndexRef(userId: string) {
    return this.db.ref(`chats/userIndex/${userId}`);
  }

  async mirrorConversation(conversation: Conversation): Promise<void> {
    try {
      await Promise.all([
        this.conversationRef(conversation.id).set({
          userId: conversation.userId,
          userDisplayName: conversation.userDisplayName ?? null,
          lastMessagePreview: conversation.lastMessagePreview ?? null,
          lastMessageAt: conversation.lastMessageAt
            ? conversation.lastMessageAt.getTime()
            : null,
          unreadByAdmin: conversation.unreadByAdmin,
          unreadByUser: conversation.unreadByUser,
          updatedAt: Date.now(),
        }),
        this.userIndexRef(conversation.userId).set(conversation.id),
      ]);
    } catch (err) {
      // Realtime mirroring is best-effort — never let a Firebase hiccup fail
      // the underlying SQL-backed request. Clients simply won't get a live
      // update this one time; a REST refetch will still show correct data.
      this.logger.error(
        `Failed to mirror conversation ${conversation.id}: ${(err as Error).message}`,
      );
    }
  }

  async mirrorMessage(message: Message): Promise<void> {
    try {
      await this.messagesRef(message.conversationId)
        .child(message.id)
        .set({
          senderId: message.senderId,
          senderRole: message.senderRole,
          body: message.body,
          isRead: message.isRead,
          createdAt: message.createdAt.getTime(),
        });
    } catch (err) {
      this.logger.error(
        `Failed to mirror message ${message.id}: ${(err as Error).message}`,
      );
    }
  }

  async mirrorReadState(
    conversationId: string,
    readerRole: SenderRole,
    unreadCount: number,
  ): Promise<void> {
    const field = readerRole === 'admin' ? 'unreadByAdmin' : 'unreadByUser';
    try {
      await this.conversationRef(conversationId).update({
        [field]: unreadCount,
        updatedAt: Date.now(),
      });
    } catch (err) {
      this.logger.error(
        `Failed to mirror read state for ${conversationId}: ${(err as Error).message}`,
      );
    }
  }
}
