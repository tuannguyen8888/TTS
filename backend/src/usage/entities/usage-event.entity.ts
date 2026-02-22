import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('usage_events')
@Index(['jobId'], { unique: true })
export class UsageEvent {
  @PrimaryColumn('uuid')
  id!: string;

  @Column()
  jobId!: string;

  @Column()
  tenantId!: string;

  @Column({ type: 'int', default: 0 })
  charCount!: number;

  @Column({ type: 'varchar', length: 32 })
  status!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
