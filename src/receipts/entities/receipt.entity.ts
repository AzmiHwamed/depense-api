import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ReceiptItem } from './receipt-item.entity';

@Entity('receipts')
export class Receipt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // --- fields returned by the Gemini Receipt OCR service ---
  @Column({ nullable: true, default: 'receipt' })
  documentType: string;

  @Column({ nullable: true })
  language: string;

  @Column({ nullable: true })
  country: string ;

  @Column({ nullable: true })
  merchant: string ;

  @Column({ type: 'text', nullable: true })
  address: string ;

  @Column({ nullable: true })
  phone: string ;

  @Column({ nullable: true })
  invoiceNumber: string ;

  @Column({ nullable: true })
  date: string ;

  @Column({ nullable: true })
  time: string ;

  @Column({ nullable: true })
  currency: string ;

  @Column({ type: 'float', nullable: true })
  subtotal: number ;

  @Column({ type: 'float', nullable: true })
  tax: number ;

  @Column({ type: 'float', nullable: true })
  total: number ;

  @Column({ nullable: true })
  paymentMethod: string ;

  @Column({ type: 'text', nullable: true })
  rawText: string ;

  @OneToMany(() => ReceiptItem, (item) => item.receipt, {
    cascade: true,
    eager: true,
  })
  items: ReceiptItem[];

  // --- bookkeeping / provenance ---
  @Column({ nullable: true })
  originalFileName: string ;

  @Column({ nullable: true })
  imageMimeType: string ;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
