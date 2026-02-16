import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('api_keys')
export class ApiKey {
  @PrimaryColumn('uuid')
  id!: string;

  @Column()
  tenantId!: string;

  @Column()
  keyHash!: string;

  @Column()
  keyPrefix!: string;

  @Column({ type: 'varchar', length: 32, default: 'active' })
  status!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
