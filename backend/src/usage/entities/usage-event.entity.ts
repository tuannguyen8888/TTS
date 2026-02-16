import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('usage_events')
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
