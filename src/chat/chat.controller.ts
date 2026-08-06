import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { AdminGuard } from 'src/auth/admin.guard';
import { User } from 'src/user/entities/user.entity';
import { CurrentUser } from 'src/auth/current-user.decorator';

/**
 * All real-time delivery happens through Firebase Realtime Database, which
 * every endpoint here mirrors into after writing to SQL (see ChatService /
 * ChatRealtimeService). Clients subscribe directly to RTDB with the Firebase
 * client SDK — these REST endpoints are for the initial write, history
 * pagination, and anything that shouldn't live purely on the client.
 */
@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ── User-facing: their own single conversation ──────────────

  @Get('conversations/me')
  @ApiOperation({
    summary: "Get (or create) the current user's support conversation",
  })
  @ApiResponse({ status: 200, type: Conversation })
  async getMyConversation(@CurrentUser() user: User): Promise<Conversation> {
    return this.chatService.getOrCreateConversation(user.id, user.displayName);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({
    summary: 'Get messages in a conversation (paginated, newest page first)',
  })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiResponse({ status: 200, type: [Message] })
  async getMessages(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
  ): Promise<Message[]> {
    if (!user.isAdmin()) {
      await this.chatService.assertUserOwnsConversation(id, user.id);
    }
    return this.chatService.getMessages(id, {
      before: before ? new Date(before) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('conversations/:id/messages')
  @ApiOperation({
    summary:
      'Send a message. Persists to SQL and mirrors instantly to Firebase Realtime Database for live delivery.',
  })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiResponse({ status: 201, type: Message })
  async sendMessage(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ): Promise<Message> {
    const conversation = user.isAdmin()
      ? await this.chatService.findByIdOrThrow(id)
      : await this.chatService.assertUserOwnsConversation(id, user.id);

    return this.chatService.postMessage(
      conversation.id,
      user.id,
      user.isAdmin() ? 'admin' : 'user',
      dto.body,
    );
  }

  @Patch('conversations/:id/read')
  @ApiOperation({ summary: 'Mark a conversation as read for the current role' })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  async markRead(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<void> {
    if (!user.isAdmin()) {
      await this.chatService.assertUserOwnsConversation(id, user.id);
    }
    const role = user.isAdmin() ? 'admin' : 'user';
    await this.chatService.markRead(id, role);
  }

  // ── Admin-facing: list of all conversations ─────────────────

  @Get('conversations')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'List all support conversations (admin only)' })
  @ApiResponse({ status: 200, type: [Conversation] })
  async listConversations(): Promise<Conversation[]> {
    return this.chatService.listConversations();
  }
}
