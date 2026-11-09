import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { PaymentPlan } from './payment-plan.entity';
import { Currency } from '../../currency/entities/currency.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentProvider {
  KONNECT = 'konnect',
  MOYASSER = 'moyasser',
  MANUAL = 'manual', // for admin-granted access, testing, etc.
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => PaymentPlan, { eager: true })
  @JoinColumn({ name: 'paymentPlanId' })
  plan: PaymentPlan;

  @Column()
  paymentPlanId: string;

  /** Token quantity agreed at checkout, independent of later deal edits. */
  @Column({ type: 'int', default: 0 })
  tokenCount: number;

  // Amount actually charged, in the currency actually charged —
  // snapshot at time of payment, so historical records don't shift
  // if exchange rates or plan prices change later.
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @ManyToOne(() => Currency, { eager: true })
  @JoinColumn({ name: 'currencyId' })
  currency: Currency;

  @Column()
  currencyId: string;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'enum', enum: PaymentProvider, nullable: true })
  provider: PaymentProvider;

  @Column({ nullable: true })
  providerTransactionId: string; // Konnect/Moyasser's own reference id

  //   @Column({ type: 'jsonb', nullable: true })
  //   providerMetadata: Record<string, any>; // raw payload/response for auditing

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
