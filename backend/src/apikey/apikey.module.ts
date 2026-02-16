import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ApiKey } from './entities/api-key.entity';
import { ApikeyController } from './apikey.controller';
import { ApikeyService } from './apikey.service';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKey]), AuthModule],
  controllers: [ApikeyController],
  providers: [ApikeyService],
  exports: [ApikeyService],
})
export class ApikeyModule {}
