import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { HmacGuard } from '../../common/hmac.guard';
import { logJson } from '../../common/json-logger';
import { RequestWithContext } from '../../common/request-context.middleware';
import { MetricsService } from '../../metrics/metrics.service';
import { TtsService } from '../tts.service';

class CallbackDto {
  @IsString()
  job_id!: string;

  @IsString()
  @IsIn(['queued', 'processing', 'completed', 'failed'])
  status!: string;

  @IsOptional()
  @IsString()
  audio_url?: string;

  @IsOptional()
  @IsString()
  error_code?: string;

  @IsOptional()
  @IsString()
  error_message?: string;
}

class UploadAudioDto {
  @IsString()
  job_id!: string;

  @IsString()
  audio_base64!: string;
}

@ApiTags('internal')
@Controller('internal/v1/tts')
@UseGuards(HmacGuard)
export class InternalTtsController {
  constructor(
    private tts: TtsService,
    private metrics: MetricsService,
  ) {}

  @Post('callback')
  async callback(@Body() dto: CallbackDto, @Req() req: RequestWithContext) {
    const job = await this.tts.getJobById(dto.job_id);
    if (!job) return { error: 'NOT_FOUND' };
    await this.tts.updateJobStatus(dto.job_id, dto.status as any, {
      audioUrl: dto.audio_url,
      errorCode: dto.error_code,
      errorMessage: dto.error_message,
    });
    if (dto.status === 'failed') this.metrics.incError();
    logJson({
      event: 'runpod_callback_received',
      request_id: req.requestId,
      job_id: dto.job_id,
      tenant_id: job.tenantId,
      error_code: dto.error_code,
    });
    return { ok: true };
  }

  @Post('upload-audio')
  async uploadAudio(@Body() dto: UploadAudioDto, @Req() req: RequestWithContext) {
    const job = await this.tts.getJobById(dto.job_id);
    if (!job) return { error: 'NOT_FOUND' };
    if (job.status === 'completed') {
      logJson({
        event: 'runpod_audio_duplicate_ignored',
        request_id: req.requestId,
        job_id: dto.job_id,
        tenant_id: job.tenantId,
      });
      return { ok: true, duplicate: true };
    }
    await this.tts.updateJobStatus(dto.job_id, 'completed', {
      audioUrl: `data:audio/wav;base64,${dto.audio_base64}`,
    });
    const charCount = job.text.length;
    await this.tts.recordUsageAndBilling(dto.job_id, job.tenantId, charCount, 'completed');
    this.metrics.incSuccess();
    this.metrics.observeRunpodCallbackDelay(Date.now() - new Date(job.createdAt).getTime());
    logJson({
      event: 'runpod_audio_uploaded',
      request_id: req.requestId,
      job_id: dto.job_id,
      tenant_id: job.tenantId,
    });
    return { ok: true };
  }
}
