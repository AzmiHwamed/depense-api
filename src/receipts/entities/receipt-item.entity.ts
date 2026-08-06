import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Receipt } from './receipt.entity';

@Entity('receipt_items')
export class ReceiptItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'float', default: 1 })
  quantity: number;

  @Column({ type: 'float', nullable: true })
  unitPrice: number | null;

  @Column({ type: 'float', nullable: true })
  totalPrice: number | null;

  @ManyToOne(() => Receipt, (receipt) => receipt.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'receiptId' })
  receipt: Receipt;

  @Column()
  receiptId: string;
}
