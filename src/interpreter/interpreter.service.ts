import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { CreateInterpreterConversationDto } from './dto/create-conversation.dto';
import { CreateInterpreterTurnDto } from './dto/create-turn.dto';
import { InterpreterConversation } from './entities/interpreter-conversation.entity';
import { InterpreterTurn } from './entities/interpreter-turn.entity';
import { InterpreterAiService } from './interpreter-ai.service';

@Injectable()
export class InterpreterService {
  private readonly audioDirectory = join(process.cwd(), 'files', 'interpreter');
  constructor(
    @InjectRepository(InterpreterConversation) private readonly conversations: Repository<InterpreterConversation>,
    @InjectRepository(InterpreterTurn) private readonly turns: Repository<InterpreterTurn>,
    private readonly ai: InterpreterAiService,
  ) {}

  create(user: User, dto: CreateInterpreterConversationDto) {
    return this.conversations.save(this.conversations.create({ ...dto, title: dto.title ?? null, userId: user.id }));
  }

  list(user: User) {
    return this.conversations.find({ where: { userId: user.id }, order: { updatedAt: 'DESC' } });
  }

  async get(user: User, id: string) {
    const conversation = await this.conversations.findOne({ where: { id, userId: user.id }, relations: { turns: true } });
    if (!conversation) throw new NotFoundException('Interpreter conversation not found');
    conversation.turns.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return conversation;
  }

  async addTurn(user: User, conversationId: string, dto: CreateInterpreterTurnDto, file: Express.Multer.File) {
    await this.get(user, conversationId);
    const sourceText = await this.ai.transcribe(file, dto.sourceLanguage);
    const translatedText = await this.ai.translate(sourceText, dto.sourceLanguage, dto.targetLanguage);
    const translatedAudio = await this.ai.synthesize(translatedText, dto.targetLanguage);

    await mkdir(this.audioDirectory, { recursive: true });
    const sourceExtension = this.safeExtension(file.originalname, file.mimetype);
    const sourceName = `${randomUUID()}${sourceExtension}`;
    const translatedName = `${randomUUID()}.mp3`;
    await Promise.all([
      writeFile(join(this.audioDirectory, sourceName), file.buffer),
      writeFile(join(this.audioDirectory, translatedName), translatedAudio.audio),
    ]);

    const turn = await this.turns.save(this.turns.create({
      conversationId, ...dto, sourceText, translatedText,
      sourceAudioUrl: `/files/interpreter/${sourceName}`,
      translatedAudioUrl: `/files/interpreter/${translatedName}`,
      sourceMimeType: file.mimetype,
      translatedMimeType: translatedAudio.mimeType,
    }));
    await this.conversations.update(conversationId, { updatedAt: new Date() });
    return turn;
  }

  async remove(user: User, id: string) {
    const conversation = await this.get(user, id);
    const files = conversation.turns.flatMap((turn) => [turn.sourceAudioUrl, turn.translatedAudioUrl]);
    await this.conversations.remove(conversation);
    await Promise.all(files.map((url) => unlink(join(process.cwd(), url.replace(/^\//, ''))).catch(() => undefined)));
    return { deleted: true };
  }

  private safeExtension(name: string, mime: string): string {
    const extension = extname(name).toLowerCase();
    if (['.webm', '.ogg', '.wav', '.flac', '.mp3', '.m4a'].includes(extension)) return extension;
    return mime.includes('ogg') ? '.ogg' : mime.includes('wav') ? '.wav' : '.webm';
  }
}
