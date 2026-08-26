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
import { Currency } from '../../currency/entities/currency.entity';
import { Language } from '../../language/entities/language.entity';

@Entity('countries')
export class Country {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Index({ unique: true })
  @Column({ length: 2 })
  alpha2Code: string; // e.g. "US"

  @Index({ unique: true })
  @Column({ length: 3 })
  alpha3Code: string; // e.g. "USA"

  @Column({ nullable: true })
  flag: string; // emoji flag, e.g. "🇺🇸"

  @Column({ nullable: true })
  region: string;

  @Column({ nullable: true })
  capital: string;

  // ── Reference to our own Currency entity ──────────────
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

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
