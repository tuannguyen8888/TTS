import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class SuperAdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(SuperAdminBootstrapService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async onModuleInit(): Promise<void> {
    const email = this.config.get<string>('SUPER_ADMIN_EMAIL')?.trim().toLowerCase();
    const password = this.config.get<string>('SUPER_ADMIN_PASSWORD');
    if (!email || !password) return;

    const existed = await this.users.findOne({ where: { email } });
    if (existed) {
      if (!existed.isSuperAdmin) {
        existed.isSuperAdmin = true;
        await this.users.save(existed);
        this.logger.log(`Promoted existing user to super admin: ${email}`);
      }
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await this.users.save(
      this.users.create({
        id: randomUUID(),
        email,
        passwordHash,
        isVerified: true,
        isSuperAdmin: true,
      }),
    );
    this.logger.log(`Created super admin user: ${email}`);
  }
}

