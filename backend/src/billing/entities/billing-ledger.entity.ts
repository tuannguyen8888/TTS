import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('billing_ledger')
@Index(['jobId'], { unique: true })
export class BillingLedger {
  @PrimaryColumn('uuid')
  id!: string;

  @Column()
  jobId!: string;

  @Column()
  tenantId!: string;

  @Column({ type: 'int', default: 0 })
  charCount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0 })
  amount!: string;

  @Column({ type: 'varchar', length: 32 })
  month!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
