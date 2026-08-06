import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { getAuth } from 'firebase-admin/auth';
// If you already have a shared Firebase admin provider (the same one
// FirebaseAuthGuard uses), inject/use that instead of calling getAuth()
// directly here — this assumes firebase-admin's default app is initialized
// elsewhere at bootstrap (e.g. in main.ts or an AuthModule), same as your guard.
import { ChatService } from './chat.service';

interface AuthedSocket extends Socket {
  data: {
    uid: string;
    isAdmin: boolean;
  };
}

@WebSocketGateway({ namespace: '/support-ws', cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private static readonly ADMIN_ROOM = 'admins';

  constructor(private readonly chatService: ChatService) {}

  async handleConnection(client: AuthedSocket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.headers.authorization?.replace('Bearer ', '') as
          string | undefined);

      if (!token) {
        throw new Error('Missing auth token');
      }

      const decoded = await getAuth().verifyIdToken(token);
      client.data.uid = decoded.uid;
      // Adjust this to whatever custom claim / lookup your AdminGuard checks.
      client.data.isAdmin = Boolean(
        (decoded as any).isAdmin ?? (decoded as any).admin,
      );

      if (client.data.isAdmin) {
        client.join(ChatGateway.ADMIN_ROOM);
      } else {
        const conversation = await this.chatService.getOrCreateConversation(
          client.data.uid,
        );
        client.join(this.roomFor(conversation.id));
      }
    } catch (err) {
      this.logger.warn(`Rejected socket connection: ${(err as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(_client: AuthedSocket) {
    // No explicit cleanup needed — socket.io drops room membership automatically.
  }

  // Admins call this when they open a specific thread in the UI.
  @SubscribeMessage('conversation:join')
  async handleJoin(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.data.isAdmin) return;
    client.join(this.roomFor(data.conversationId));
  }

  @SubscribeMessage('message:send')
  async handleSend(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { conversationId?: string; body: string },
  ) {
    const senderRole = client.data.isAdmin ? 'admin' : 'user';

    const conversation = client.data.isAdmin
      ? await this.chatService.findByIdOrThrow(data.conversationId!)
      : await this.chatService.getOrCreateConversation(client.data.uid);

    const message = await this.chatService.postMessage(
      conversation.id,
      client.data.uid,
      senderRole,
      data.body,
    );

    this.broadcastMessage(conversation.id, message);

    if (senderRole === 'user') {
      this.server.to(ChatGateway.ADMIN_ROOM).emit('conversation:updated', {
        conversationId: conversation.id,
        lastMessagePreview: message.body.slice(0, 200),
        lastMessageAt: message.createdAt,
      });
    }
  }

  @SubscribeMessage('conversation:read')
  async handleRead(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const role = client.data.isAdmin ? 'admin' : 'user';
    if (!client.data.isAdmin) {
      await this.chatService.assertUserOwnsConversation(
        data.conversationId,
        client.data.uid,
      );
    }
    await this.chatService.markRead(data.conversationId, role);
    this.broadcastRead(data.conversationId, role);
  }

  // Used by the REST controller too, so the fallback path stays in sync with sockets.
  broadcastMessage(conversationId: string, message: unknown) {
    this.server.to(this.roomFor(conversationId)).emit('message:new', message);
  }

  broadcastRead(conversationId: string, readerRole: 'user' | 'admin') {
    this.server
      .to(this.roomFor(conversationId))
      .emit('conversation:read', { conversationId, readerRole });
  }

  private roomFor(conversationId: string): string {
    return `conversation:${conversationId}`;
  }
}
