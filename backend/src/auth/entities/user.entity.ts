import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 191, unique: true })
  email!: string;

  @Column({ type: 'text' })
  passwordHash!: string;

  @Column({ type: 'boolean', default: true })
  isVerified!: boolean;

  @Column({ type: 'boolean', default: false })
  isSuperAdmin!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}

