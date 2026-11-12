import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export const AI_SERVICES = ['receiptScan', 'interpreterTurn', 'textTranslation', 'tripPlan'] as const;
export type AiServiceKey = (typeof AI_SERVICES)[number];

@Entity('ai_service_prices')
export class AiServicePrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  service: AiServiceKey;

  @Column({ type: 'int' })
  tokenCost: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
