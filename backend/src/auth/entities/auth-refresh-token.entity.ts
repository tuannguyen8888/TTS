import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity('auth_refresh_tokens')
@Index(['tokenHash'], { unique: true })
export class AuthRefreshToken {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid', nullable: true })
  tenantId?: string | null;

  @Column({ type: 'text' })
  tokenHash!: string;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}

