import { User } from 'src/user/entities/user.entity';
import { Expense } from 'src/expense/entities/expense.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

@Entity('expense_categories')
@Index(['userId', 'name'], { unique: true }) // a user can't have two categories with the same name
export class ExpenseCategory {
  @ApiProperty({ example: 'b3f1c2a0-1234-4a5b-8c9d-abcdef123456' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Groceries' })
  @Column()
  name: string;

  @ApiPropertyOptional({ example: 'shopping-cart' })
  @Column({ nullable: true })
  icon: string; // e.g. an icon key/name used by the frontend

  @ApiPropertyOptional({ example: '#22C55E' })
  @Column({ nullable: true })
  color: string; // e.g. hex color for UI badges/charts

  @ApiPropertyOptional({ example: 'Weekly food and household shopping' })
  @Column({ nullable: true })
  description: string;

  @ApiPropertyOptional({ type: () => User })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({ example: 'a1b2c3d4-1234-4a5b-8c9d-abcdef123456' })
  @Column()
  userId: string;

  @ApiPropertyOptional({ type: () => [Expense] })
  @OneToMany(() => Expense, (expense) => expense.category)
  expenses: Expense[];

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
