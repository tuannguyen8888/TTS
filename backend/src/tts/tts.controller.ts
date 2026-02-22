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

    if (job.status !== 'queued') {
      return { job_id: job.id, status: job.status };
    }

    const charCount = job.text.length;
    logJson({
      event: 'tts_job_created',
      request_id: requestId,
      job_id: job.id,
      tenant_id: job.tenantId,
    });
    await this.tts.updateJobStatus(job.id, 'processing');

    // Fire-and-forget: gọi Runpod async với retry/backoff rõ ràng.
    void this.tts
      .processRunpodJob(job, requestId)
      .then(async (result) => {
        if (result.audioBase64) {
          await this.tts.updateJobStatus(job.id, 'completed', {
            audioUrl: `data:audio/wav;base64,${result.audioBase64}`,
          });
          await this.tts.recordUsageAndBilling(
            job.id,
            job.tenantId,
            charCount,
            'completed',
          );
          this.metrics.incSuccess();
          return;
        }

        if (result.callbackSent) {
          // Runpod đã callback về internal upload-audio; status sẽ được cập nhật tại InternalTtsController.
          return;
        }

        const errorCode = result.error ?? 'RUNPOD_ERROR';
        await this.tts.updateJobStatus(job.id, 'failed', {
          errorCode,
          errorMessage: errorCode,
        });
        await this.tts.recordUsageAndBilling(
          job.id,
          job.tenantId,
          charCount,
          'failed',
        );
        this.metrics.incError();
      })
      .catch(async (error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'RUNPOD_PROCESSING_ERROR';
        try {
          logJson({
            event: 'runpod_processing_crashed',
            request_id: requestId,
            job_id: job.id,
            tenant_id: job.tenantId,
            error_code: message,
          });
          await this.tts.updateJobStatus(job.id, 'failed', {
            errorCode: 'RUNPOD_PROCESSING_ERROR',
            errorMessage: message,
          });
          await this.tts.recordUsageAndBilling(
            job.id,
            job.tenantId,
            charCount,
            'failed',
          );
          this.metrics.incError();
        } catch (persistError) {
          const persistMessage =
            persistError instanceof Error
              ? persistError.message
              : 'RUNPOD_ERROR_PERSIST_FAILED';
          logJson({
            event: 'runpod_failure_persist_crashed',
            request_id: requestId,
            job_id: job.id,
            tenant_id: job.tenantId,
            error_code: persistMessage,
          });
        }
      });

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
