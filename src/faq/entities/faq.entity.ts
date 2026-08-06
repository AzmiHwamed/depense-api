import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { FaqCategory } from './faq-category.entity';

@Entity('faqs')
@Index(['categoryId', 'order'])
export class Faq {
  @ApiProperty({ example: 'd4e5f6a7-1234-4a5b-8c9d-abcdef123456' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'How do I reset my password?' })
  @Column()
  question: string;

  @ApiProperty({
    example:
      'Go to Settings > Account > Reset Password and follow the instructions sent to your email.',
  })
  @Column({ type: 'text' })
  answer: string;

  @ApiPropertyOptional({ type: () => FaqCategory })
  @ManyToOne(() => FaqCategory, (category) => category.faqs, {
    nullable: true,
    onDelete: 'SET NULL',
    eager: true,
  })
  @JoinColumn({ name: 'categoryId' })
  category: FaqCategory;

  @ApiPropertyOptional({ example: 'b3f1c2a0-1234-4a5b-8c9d-abcdef123456' })
  @Column({ nullable: true })
  categoryId: string;

  @ApiProperty({
    example: 0,
    description: 'Lower numbers are shown first within a category',
  })
  @Column({ default: 0 })
  order: number;

  @ApiProperty({
    example: true,
    description: 'Inactive FAQs are hidden from the public list',
  })
  @Column({ default: true })
  @Index()
  isActive: boolean;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
