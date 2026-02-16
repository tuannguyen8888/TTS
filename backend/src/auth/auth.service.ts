import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes, randomUUID, createHash } from 'crypto';
import { Repository } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthRefreshToken } from './entities/auth-refresh-token.entity';
import {
  TenantMembership,
  TenantRole,
} from './entities/tenant-membership.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { Tenant } from './entities/tenant.entity';
import { User } from './entities/user.entity';
import { JwtAccessPayload } from './auth.types';

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    tenantId?: string;
    role?: TenantRole;
    isSuperAdmin: boolean;
  };
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenants: Repository<Tenant>,
    @InjectRepository(TenantMembership)
    private readonly memberships: Repository<TenantMembership>,
    @InjectRepository(AuthRefreshToken)
    private readonly refreshTokens: Repository<AuthRefreshToken>,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokens: Repository<PasswordResetToken>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();
    const existed = await this.users.findOne({ where: { email } });
    if (existed) {
      throw new BadRequestException({ error: 'EMAIL_ALREADY_EXISTS' });
    }

    const tenantId = randomUUID();
    const userId = randomUUID();
    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.tenants.save(
      this.tenants.create({
        id: tenantId,
        name: dto.tenantName.trim(),
        status: 'active',
      }),
    );
    await this.users.save(
      this.users.create({
        id: userId,
        email,
        passwordHash,
        isVerified: true,
      }),
    );
    await this.memberships.save(
      this.memberships.create({
        id: randomUUID(),
        tenantId,
        userId,
        role: 'member',
      }),
    );

    return this.issueAuthTokens({
      userId,
      email,
      tenantId,
      role: 'member',
      isSuperAdmin: false,
    });
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.users.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException({ error: 'INVALID_CREDENTIALS' });
    }
    const matched = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matched) {
      throw new UnauthorizedException({ error: 'INVALID_CREDENTIALS' });
    }

    if (user.isSuperAdmin) {
      return this.issueAuthTokens({
        userId: user.id,
        email: user.email,
        tenantId: undefined,
        role: undefined,
        isSuperAdmin: true,
      });
    }

    const membership = await this.pickMembership(user.id, dto.tenantId);
    if (!membership) {
      throw new UnauthorizedException({ error: 'TENANT_NOT_FOUND_FOR_USER' });
    }

    return this.issueAuthTokens({
      userId: user.id,
      email: user.email,
      tenantId: membership.tenantId,
      role: membership.role,
      isSuperAdmin: false,
    });
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const tokenHash = this.hashToken(refreshToken);
    const tokenRow = await this.refreshTokens.findOne({
      where: { tokenHash },
    });
    if (!tokenRow || tokenRow.revokedAt || tokenRow.expiresAt <= new Date()) {
      throw new UnauthorizedException({ error: 'INVALID_REFRESH_TOKEN' });
    }

    const user = await this.users.findOne({ where: { id: tokenRow.userId } });
    if (!user) {
      throw new UnauthorizedException({ error: 'INVALID_REFRESH_TOKEN' });
    }
    let membership: TenantMembership | null = null;
    if (tokenRow.tenantId) {
      membership = await this.memberships.findOne({
        where: { tenantId: tokenRow.tenantId, userId: tokenRow.userId },
      });
      if (!membership) {
        throw new UnauthorizedException({ error: 'TENANT_MEMBERSHIP_NOT_FOUND' });
      }
    } else if (!user.isSuperAdmin) {
      throw new UnauthorizedException({ error: 'INVALID_REFRESH_TOKEN' });
    }

    tokenRow.revokedAt = new Date();
    await this.refreshTokens.save(tokenRow);

    return this.issueAuthTokens({
      userId: user.id,
      email: user.email,
      tenantId: membership?.tenantId,
      role: membership?.role,
      isSuperAdmin: user.isSuperAdmin,
    });
  }

  async logout(refreshToken: string): Promise<{ ok: boolean }> {
    const tokenHash = this.hashToken(refreshToken);
    const row = await this.refreshTokens.findOne({ where: { tokenHash } });
    if (row && !row.revokedAt) {
      row.revokedAt = new Date();
      await this.refreshTokens.save(row);
    }
    return { ok: true };
  }

  async forgotPassword(emailInput: string): Promise<{ ok: boolean }> {
    const email = emailInput.trim().toLowerCase();
    const user = await this.users.findOne({ where: { email } });
    if (!user) return { ok: true };

    const rawToken = randomBytes(32).toString('hex');
    const ttlMinutes = Number(
      this.config.get<string>('RESET_PASSWORD_TTL_MINUTES') ?? '30',
    );
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    await this.resetTokens.save(
      this.resetTokens.create({
        id: randomUUID(),
        userId: user.id,
        tokenHash: this.hashToken(rawToken),
        expiresAt,
      }),
    );

    const appBase =
      this.config.get<string>('DASHBOARD_BASE_URL') ?? 'http://localhost:3001';
    const resetUrl = `${appBase}/reset-password?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(email)}`;
    await this.mail.sendResetPasswordEmail({ to: email, resetUrl });
    return { ok: true };
  }

  async resetPassword(params: {
    email: string;
    token: string;
    newPassword: string;
  }): Promise<{ ok: boolean }> {
    const email = params.email.trim().toLowerCase();
    const user = await this.users.findOne({ where: { email } });
    if (!user) {
      throw new BadRequestException({ error: 'INVALID_RESET_TOKEN' });
    }
    const row = await this.resetTokens.findOne({
      where: { tokenHash: this.hashToken(params.token), userId: user.id },
    });
    if (!row || row.usedAt || row.expiresAt <= new Date()) {
      throw new BadRequestException({ error: 'INVALID_RESET_TOKEN' });
    }

    row.usedAt = new Date();
    user.passwordHash = await bcrypt.hash(params.newPassword, 10);
    await this.resetTokens.save(row);
    await this.users.save(user);

    await this.refreshTokens
      .createQueryBuilder()
      .update(AuthRefreshToken)
      .set({ revokedAt: new Date() })
      .where('userId = :userId AND revokedAt IS NULL', { userId: user.id })
      .execute();

    return { ok: true };
  }

  async me(userId: string, tenantId?: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException({ error: 'NOT_AUTHORIZED' });
    }

    if (user.isSuperAdmin) {
      return {
        user: {
          id: user.id,
          email: user.email,
        },
        isSuperAdmin: true,
      };
    }

    if (!tenantId) {
      throw new UnauthorizedException({ error: 'MISSING_TENANT' });
    }
    const membership = await this.memberships.findOne({
      where: { userId, tenantId },
    });
    if (!membership) {
      throw new UnauthorizedException({ error: 'NOT_AUTHORIZED' });
    }

    const tenant = await this.tenants.findOne({ where: { id: tenantId } });
    return {
      user: {
        id: user.id,
        email: user.email,
      },
      tenant: tenant
        ? {
            id: tenant.id,
            name: tenant.name,
            status: tenant.status,
          }
        : { id: tenantId },
      isSuperAdmin: false,
    };
  }

  private async pickMembership(
    userId: string,
    tenantId?: string,
  ): Promise<TenantMembership | null> {
    if (tenantId) {
      return this.memberships.findOne({
        where: { userId, tenantId },
      });
    }
    return this.memberships.findOne({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private async issueAuthTokens(params: {
    userId: string;
    email: string;
    tenantId?: string;
    role?: TenantRole;
    isSuperAdmin: boolean;
  }): Promise<AuthResponse> {
    const payload: JwtAccessPayload = {
      sub: params.userId,
      email: params.email,
      tenantId: params.tenantId,
      role: params.role,
      isSuperAdmin: params.isSuperAdmin,
    };
    const accessTtl = this.config.get<string>('JWT_ACCESS_TTL') ?? '15m';
    const accessToken = await this.jwt.signAsync(payload, {
      secret:
        this.config.get<string>('JWT_ACCESS_SECRET') ??
        this.config.get<string>('JWT_SECRET') ??
        'dev-access-secret',
      expiresIn: accessTtl as any,
    });

    const refreshRaw = randomBytes(48).toString('hex');
    const refreshExpiresDays = Number(
      this.config.get<string>('JWT_REFRESH_TTL_DAYS') ?? '30',
    );
    const refreshEntity = this.refreshTokens.create({
      id: randomUUID(),
      userId: params.userId,
      tenantId: params.tenantId ?? null,
      tokenHash: this.hashToken(refreshRaw),
      expiresAt: new Date(Date.now() + refreshExpiresDays * 24 * 60 * 60 * 1000),
    });
    await this.refreshTokens.save(refreshEntity);

    return {
      accessToken,
      refreshToken: refreshRaw,
      user: {
        id: params.userId,
        email: params.email,
        tenantId: params.tenantId,
        role: params.role,
        isSuperAdmin: params.isSuperAdmin,
      },
    };
  }
}

