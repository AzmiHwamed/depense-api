import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Message } from './message.entity';

@Entity('chat_conversations')
export class Conversation {
  @ApiProperty({ example: 'b3f1c2a0-1234-4a5b-8c9d-abcdef123456' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Firebase UID of the user this thread belongs to. One conversation per user.
  @ApiProperty({ example: 'xzLc0oJ9p5Qq2zWDsVmKc2DXLbh1' })
  @Index({ unique: true })
  @Column()
  userId: string;

  @ApiPropertyOptional({ example: 'Jane Doe' })
  @Column({ type: 'varchar', nullable: true })
  userDisplayName: string | null;

  @ApiPropertyOptional({ example: 'Thanks, that fixed it!' })
  @Column({ type: 'text', nullable: true })
  lastMessagePreview: string | null;

  @ApiPropertyOptional({ example: '2026-07-26T10:00:00.000Z' })
  @Column({ type: 'datetime', nullable: true })
  lastMessageAt: Date | null;

  @ApiProperty({
    example: 2,
    description: 'Unread messages from the user, for the admin badge',
  })
  @Column({ default: 0 })
  unreadByAdmin: number;

  @ApiProperty({
    example: 0,
    description: 'Unread messages from admin, for the user badge',
  })
  @Column({ default: 0 })
  unreadByUser: number;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
