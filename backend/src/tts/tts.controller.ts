import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ApikeyGuard } from '../common/apikey.guard';
import { logJson } from '../common/json-logger';
import { RequestWithContext } from '../common/request-context.middleware';
import { MetricsService } from '../metrics/metrics.service';
import { TtsService } from './tts.service';
import { SynthesizeDto } from './dto/synthesize.dto';

@ApiTags('tts')
@Controller('v1/tts')
@UseGuards(ApikeyGuard)
export class TtsController {
  constructor(
    private tts: TtsService,
    private metrics: MetricsService,
  ) {}

  @Post('synthesize')
  @ApiOperation({ summary: 'Tạo job synthesize TTS' })
  async synthesize(@Body() dto: SynthesizeDto, @Req() req: RequestWithContext) {
    const tenantId = (req as Request & { tenantId?: string }).tenantId;
    const apiKeyId = (req as Request & { apiKeyId?: string }).apiKeyId;
    if (!tenantId) throw new UnauthorizedException({ error: 'MISSING_TENANT' });
    const requestId = req.requestId;

    const job = await this.tts.createJob({
      tenantId,
      apiKeyId,
      text: dto.text,
      voiceId: dto.voiceId,
      model: dto.model,
      idempotencyKey: dto.idempotencyKey,
    });

    const charCount = job.text.length;
    logJson({
      event: 'tts_job_created',
      request_id: requestId,
      job_id: job.id,
      tenant_id: job.tenantId,
    });
    // Fire-and-forget: gọi Runpod async (Phase 2.2)
    this.tts.callRunpodSynthesize(job, requestId).then((result) => {
      if (result.audioBase64) {
        this.tts.updateJobStatus(job.id, 'completed', {
          audioUrl: `data:audio/wav;base64,${result.audioBase64}`,
        });
        this.tts.recordUsageAndBilling(job.id, job.tenantId, charCount, 'completed');
        this.metrics.incSuccess();
      } else if (result.error && !result.callbackSent) {
        this.tts.updateJobStatus(job.id, 'failed', {
          errorCode: result.error,
          errorMessage: result.error,
        });
        this.tts.recordUsageAndBilling(job.id, job.tenantId, charCount, 'failed');
        this.metrics.incError();
      }
      // Nếu callback_sent: Runpod đã POST upload-audio, job đã được cập nhật ở InternalTtsController
    });
    this.tts.updateJobStatus(job.id, 'processing');

    return { job_id: job.id, status: 'processing' };
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Lấy trạng thái job' })
  async getJob(@Param('jobId') jobId: string, @Req() req: RequestWithContext) {
    const tenantId = (req as Request & { tenantId?: string }).tenantId;
    if (!tenantId) throw new UnauthorizedException({ error: 'MISSING_TENANT' });
    const job = await this.tts.getJob(jobId, tenantId);
    if (!job) return { error: 'NOT_FOUND' };
    return {
      job_id: job.id,
      status: job.status,
      audio_url: job.audioUrl,
      error_code: job.errorCode,
      error_message: job.errorMessage,
    };
  }
}
