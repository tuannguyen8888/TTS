import {
  Controller,
  Get,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsageService } from './usage.service';

@ApiTags('usage')
@Controller('v1/usage')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsageController {
  constructor(private usage: UsageService) {}

  @Get('summary')
  async summary(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    const tenantId = req?.tenantId;
    if (!tenantId) throw new UnauthorizedException({ error: 'MISSING_TENANT' });
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    return this.usage.getSummary(tenantId, fromDate, toDate);
  }

  @Get('transactions')
  async transactions(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    const tenantId = req?.tenantId;
    if (!tenantId) throw new UnauthorizedException({ error: 'MISSING_TENANT' });
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    return this.usage.getTransactions(tenantId, fromDate, toDate);
  }
}
