import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UsageEvent } from './entities/usage-event.entity';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';

@Module({
  imports: [TypeOrmModule.forFeature([UsageEvent]), AuthModule],
  controllers: [UsageController],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}
