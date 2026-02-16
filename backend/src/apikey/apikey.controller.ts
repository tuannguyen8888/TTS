import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApikeyService } from './apikey.service';

@ApiTags('apikey')
@Controller('v1/api-keys')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApikeyController {
  constructor(private apikey: ApikeyService) {}

  @Post()
  async create(@Req() req: AuthenticatedRequest) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new UnauthorizedException({ error: 'MISSING_TENANT' });
    return this.apikey.create(tenantId);
  }

  @Delete(':id')
  async revoke(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new UnauthorizedException({ error: 'MISSING_TENANT' });
    const ok = await this.apikey.revoke(id, tenantId);
    return { ok };
  }

  @Get()
  async list(@Req() req: AuthenticatedRequest) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new UnauthorizedException({ error: 'MISSING_TENANT' });
    return this.apikey.list(tenantId);
  }
}
