import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

export type TenantRole = 'owner' | 'admin' | 'member';

@Entity('tenant_memberships')
@Index(['tenantId', 'userId'], { unique: true })
export class TenantMembership {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 32 })
  role!: TenantRole;

  @CreateDateColumn()
  createdAt!: Date;
}

