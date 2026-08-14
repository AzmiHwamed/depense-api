import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { InterpreterConversation } from './interpreter-conversation.entity';

export enum InterpreterSpeaker { TRAVELER = 'traveler', LOCAL = 'local' }

@Entity('interpreter_turns')
export class InterpreterTurn {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column() conversationId: string;

  @ManyToOne(() => InterpreterConversation, (conversation) => conversation.turns, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' }) conversation: InterpreterConversation;

  @Column({ type: 'enum', enum: InterpreterSpeaker }) speaker: InterpreterSpeaker;
  @Column({ length: 35 }) sourceLanguage: string;
  @Column({ length: 35 }) targetLanguage: string;
  @Column({ type: 'text' }) sourceText: string;
  @Column({ type: 'text' }) translatedText: string;
  @Column({ length: 500 }) sourceAudioUrl: string;
  @Column({ length: 500 }) translatedAudioUrl: string;
  @Column({ length: 100 }) sourceMimeType: string;
  @Column({ length: 100, default: 'audio/mpeg' }) translatedMimeType: string;
  @CreateDateColumn() createdAt: Date;
}
