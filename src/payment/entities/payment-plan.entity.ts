import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Currency } from '../../currency/entities/currency.entity';

@Entity('payment_plans')
export class PaymentPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // e.g. "Quarterly Plan"

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'int', default: 1 })
  tokenCount: number;

  /** Legacy schema compatibility; token packages do not use a duration. */
  @Column({ type: 'int', default: 0 })
  durationMonths: number;

  // Base price is always stored in one reference currency (USD) —
  // everything gets converted from this at request time.
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  basePrice: number;

  @ManyToOne(() => Currency, { eager: true })
  @JoinColumn({ name: 'baseCurrencyId' })
  baseCurrency: Currency;

  @Column()
  baseCurrencyId: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
