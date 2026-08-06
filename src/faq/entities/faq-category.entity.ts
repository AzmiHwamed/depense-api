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
import { Faq } from './faq.entity';

@Entity('faq_categories')
export class FaqCategory {
  @ApiProperty({ example: 'b3f1c2a0-1234-4a5b-8c9d-abcdef123456' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Account' })
  @Index({ unique: true })
  @Column()
  name: string;

  @ApiPropertyOptional({ example: 'Questions about managing your account' })
  @Column({ nullable: true })
  description: string;

  @ApiProperty({ example: 0, description: 'Lower numbers are shown first' })
  @Column({ default: 0 })
  order: number;

  @ApiProperty({
    example: true,
    description: 'Inactive categories are hidden from public listings',
  })
  @Column({ default: true })
  isActive: boolean;

  @ApiPropertyOptional({ type: () => [Faq] })
  @OneToMany(() => Faq, (faq) => faq.category)
  faqs: Faq[];

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
