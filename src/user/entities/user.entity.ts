import { Country } from 'src/country/entities/country.entity';
import { Currency } from 'src/currency/entities/currency.entity';
import { Language } from 'src/language/entities/language.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  BeforeInsert,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export enum AuthProvider {
  PASSWORD = 'password',
  GOOGLE = 'google.com',
  FACEBOOK = 'facebook.com',
}

export enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active', // paid and current
  EXPIRED = 'expired', // trial ended, no payment
  CANCELLED = 'cancelled', // paid then cancelled
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Index({ unique: true })
  @Column()
  firebaseUid: string;

  @Index({ unique: true })
  @Column()
  email: string;

  @Column({ nullable: true })
  displayName: string;

  @Column({
    nullable: true,
    default:
      'https://img.magnific.com/premium-vector/abstract-faceless-man-portrait-young-male-character-with-blank-face-headphones-unknown-person-avatar-user-profile-poster-wall-art-modern-trendy-urban-digital-style-flat-vector-illustration_198278-35786.jpg',
  })
  photoURL: string;

  @Column({ type: 'enum', enum: AuthProvider, default: AuthProvider.PASSWORD })
  provider: AuthProvider;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Country, { nullable: true, eager: true })
  @JoinColumn({ name: 'currentCountryId' })
  currentCountry: Country;

  @Column({ nullable: true })
  currentCountryId: string;
  @ManyToOne(() => Currency, { nullable: true, eager: true })
  @JoinColumn({ name: 'currencyId' })
  currency: Currency;

  @Column({ nullable: true })
  currencyId: string;


  @ManyToOne(() => Language, { nullable: true, eager: true })
  @JoinColumn({ name: 'languageId' })
  language: Language;

  @Column({ nullable: true })
  languageId: string;

  /** Wallet used for metered AI features. New accounts receive 30 tokens. */
  @Column({ type: 'int', default: 30 })
  tokenBalance: number;

  // Legacy subscription fields are retained for existing payment history.
  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.TRIAL,
  })
  subscriptionStatus: SubscriptionStatus;

  @Column({ type: 'timestamp', nullable: true })
  trialEndsAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  subscriptionEndsAt: Date; // set this once real payment integration exists

  @Column({ nullable: true })
  paymentCustomerId: string; // e.g. Stripe customer ID, filled in later

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  setTrialPeriod() {
    if (!this.trialEndsAt) {
      const trialDays = 3;
      const end = new Date();
      end.setDate(end.getDate() + trialDays);
      this.trialEndsAt = end;
    }
  }
  hasActiveAccess(): boolean {
    const now = new Date();

    if (this.subscriptionStatus === SubscriptionStatus.ACTIVE) {
      // paid and either no end date (ongoing) or still within paid period
      return !this.subscriptionEndsAt || this.subscriptionEndsAt > now;
    }

    if (this.subscriptionStatus === SubscriptionStatus.TRIAL) {
      return !!this.trialEndsAt && this.trialEndsAt > now;
    }

    return false; // EXPIRED or CANCELLED
  }
  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }
}
