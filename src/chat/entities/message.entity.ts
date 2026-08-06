import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Conversation } from './conversation.entity';

export type SenderRole = 'user' | 'admin';

@Entity('chat_messages')
@Index(['conversationId', 'createdAt'])
export class Message {
  @ApiProperty({ example: 'd4e5f6a7-1234-4a5b-8c9d-abcdef123456' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @ApiProperty()
  @Column()
  conversationId: string;

  // Firebase UID of whoever sent it (user or admin)
  @ApiProperty({ example: 'xzLc0oJ9p5Qq2zWDsVmKc2DXLbh1' })
  @Column()
  senderId: string;

  @ApiProperty({ example: 'user', enum: ['user', 'admin'] })
  @Column({ type: 'varchar' })
  senderRole: SenderRole;

  @ApiProperty({ example: 'Hi, I have a question about my invoice.' })
  @Column({ type: 'text' })
  body: string;

  @ApiProperty({ example: false })
  @Column({ default: false })
  isRead: boolean;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}
