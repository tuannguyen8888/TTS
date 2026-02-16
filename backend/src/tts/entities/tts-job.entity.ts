import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type TtsJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

@Entity('tts_jobs')
export class TtsJob {
  @PrimaryColumn('uuid')
  id!: string;

  @Column()
  tenantId!: string;

  @Column({ nullable: true })
  apiKeyId?: string;

  @Column('text')
  text!: string;

  @Column({ nullable: true })
  voiceId?: string;

  @Column({ nullable: true })
  model?: string;

  @Column({ type: 'varchar', length: 32 })
  status!: TtsJobStatus;

  @Column({ nullable: true })
  audioUrl?: string;

  @Column({ type: 'text', nullable: true })
  errorCode?: string;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ nullable: true })
  idempotencyKey?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
