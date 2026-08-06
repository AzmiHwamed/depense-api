import { User } from 'src/user/entities/user.entity';
import { ExpenseCategory } from 'src/expense-category/entities/expense-category.entity';
import { Currency } from 'src/currency/entities/currency.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('expenses')
@Index(['userId', 'date'])
@Index(['userId', 'categoryId'])
export class Expense {
  @ApiProperty({ example: 'd4e5f6a7-1234-4a5b-8c9d-abcdef123456' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: '42.50',
    description: 'Decimal string; parse with Number()/parseFloat',
  })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: string; // stored as string by TypeORM for decimal precision; parse with Number()/parseFloat when needed

  @ApiPropertyOptional({ example: 'Weekly grocery run' })
  @Column({ nullable: true })
  description: string;

  @ApiProperty({ example: '2026-07-26T00:00:00.000Z' })
  @Column({ type: 'timestamp' })
  date: Date; // when the expense actually occurred (distinct from createdAt)

  @ApiPropertyOptional({ type: () => Currency })
  @ManyToOne(() => Currency, { nullable: true, eager: true })
  @JoinColumn({ name: 'currencyId' })
  currency: Currency;

  @ApiPropertyOptional({ example: 'c9d8e7f6-4321-4b5a-9c8d-fedcba654321' })
  @Column({ nullable: true })
  currencyId: string;

  @ApiPropertyOptional({ type: () => ExpenseCategory })
  @ManyToOne(() => ExpenseCategory, (category) => category.expenses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'categoryId' })
  category: ExpenseCategory;

  @ApiProperty({ example: 'b3f1c2a0-1234-4a5b-8c9d-abcdef123456' })
  @Column()
  categoryId: string;

  @ApiPropertyOptional({ type: () => User })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({ example: 'a1b2c3d4-1234-4a5b-8c9d-abcdef123456' })
  @Column()
  userId: string;

  @ApiProperty({ example: 'Ferdaws Market' })
  @Column()
  shop: string;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
