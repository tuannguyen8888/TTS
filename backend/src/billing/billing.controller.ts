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
import { BillingService } from './billing.service';

@ApiTags('billing')
@Controller('v1/billing')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BillingController {
  constructor(private billing: BillingService) {}

  @Get('ledger')
  async ledger(@Query('month') month?: string, @Req() req?: AuthenticatedRequest) {
    const tenantId = req?.tenantId;
    if (!tenantId) throw new UnauthorizedException({ error: 'MISSING_TENANT' });
    return this.billing.getLedger(tenantId, month);
  }
}
