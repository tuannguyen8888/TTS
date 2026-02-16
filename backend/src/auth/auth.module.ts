import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from '../mail/mail.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRefreshToken } from './entities/auth-refresh-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { TenantMembership } from './entities/tenant-membership.entity';
import { Tenant } from './entities/tenant.entity';
import { User } from './entities/user.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { SuperAdminBootstrapService } from './super-admin.bootstrap.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}),
    MailModule,
    TypeOrmModule.forFeature([
      User,
      Tenant,
      TenantMembership,
      AuthRefreshToken,
      PasswordResetToken,
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    SuperAdminGuard,
    SuperAdminBootstrapService,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    SuperAdminGuard,
    TypeOrmModule,
    JwtModule,
  ],
})
export class AuthModule {}
