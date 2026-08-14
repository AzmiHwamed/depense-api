import { User } from '../../user/entities/user.entity';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { InterpreterTurn } from './interpreter-turn.entity';

@Entity('interpreter_conversations')
export class InterpreterConversation {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Index()
  @Column() userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' }) user: User;

  @Column({ length: 35 }) travelerLanguage: string;
  @Column({ length: 35 }) localLanguage: string;
  @Column({ type: 'varchar', length: 120, nullable: true }) title: string | null;

  @OneToMany(() => InterpreterTurn, (turn) => turn.conversation)
  turns: InterpreterTurn[];

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
