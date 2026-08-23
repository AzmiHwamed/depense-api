import { Currency } from 'src/currency/entities/currency.entity';
import { Country } from 'src/country/entities/country.entity';
import { User } from 'src/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type TripStatus = 'active' | 'completed' | 'archived';

@Entity('trips')
@Index(['userId', 'startDate', 'endDate'])
export class Trip {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column() destination: string;
  @Column({ nullable: true }) country: string;
  @ManyToOne(() => Country, { nullable: true, eager: true })
  @JoinColumn({ name: 'countryId' })
  countryRecord: Country;
  @Column({ nullable: true }) countryId: string;
  @Column({ type: 'text', nullable: true }) notes: string;
  @Column({ type: 'int', default: 1 }) travelers: number;
  @Column({ type: 'date' }) startDate: string;
  @Column({ type: 'date' }) endDate: string;
  @Column({ type: 'decimal', precision: 12, scale: 2 }) totalAmount: string;
  @Column({ default: 'active' }) status: TripStatus;
  @Column({ type: 'json', nullable: true }) interests: string[];
  @Column({ type: 'json', nullable: true }) categoryLimits: unknown[];
  @Column({ type: 'json', nullable: true }) reminders: Record<string, unknown>;
  @Column({ type: 'json', nullable: true }) monuments: unknown[];
  @Column({ type: 'json', nullable: true }) itinerary: unknown[];
  @Column({ type: 'json', nullable: true }) budgetGuidance: Record<
    string,
    unknown
  >;
  @Column({ type: 'text', nullable: true }) aiSummary: string;

  @ManyToOne(() => Currency, { eager: true })
  @JoinColumn({ name: 'currencyId' })
  currency: Currency;
  @Column() currencyId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
  @Column() userId: string;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
