import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { BillingService } from '../billing/billing.service';
import { addHmacHeaders } from '../common/hmac-client';
import { logJson } from '../common/json-logger';
import { MetricsService } from '../metrics/metrics.service';
import { UsageService } from '../usage/usage.service';
import { TtsJob, TtsJobStatus } from './entities/tts-job.entity';

@Injectable()
export class TtsService {
  constructor(
    @InjectRepository(TtsJob)
    private jobRepo: Repository<TtsJob>,
    private config: ConfigService,
    private usage: UsageService,
    private billing: BillingService,
    private metrics: MetricsService,
  ) {}

  async createJob(params: {
    tenantId: string;
    apiKeyId?: string;
    text: string;
    voiceId?: string;
    model?: string;
    idempotencyKey?: string;
  }): Promise<TtsJob> {
    const existing = params.idempotencyKey
      ? await this.jobRepo.findOne({
          where: {
            tenantId: params.tenantId,
            idempotencyKey: params.idempotencyKey,
          },
        })
      : null;
    if (existing) return existing;

    const job = this.jobRepo.create({
      id: randomUUID(),
      tenantId: params.tenantId,
      apiKeyId: params.apiKeyId,
      text: params.text,
      voiceId: params.voiceId,
      model: params.model,
      status: 'queued',
      idempotencyKey: params.idempotencyKey,
    });
    return this.jobRepo.save(job);
  }

  async getJob(id: string, tenantId: string): Promise<TtsJob | null> {
    return this.jobRepo.findOne({
      where: { id, tenantId },
    });
  }

  async getJobById(id: string): Promise<TtsJob | null> {
    return this.jobRepo.findOne({ where: { id } });
  }

  async recordUsageAndBilling(jobId: string, tenantId: string, charCount: number, status: string) {
    await this.usage.record(jobId, tenantId, charCount, status);
    if (status === 'completed') {
      await this.billing.record(jobId, tenantId, charCount);
    }
  }

  async updateJobStatus(
    id: string,
    status: TtsJobStatus,
    meta?: { audioUrl?: string; errorCode?: string; errorMessage?: string },
  ): Promise<void> {
    await this.jobRepo.update(id, {
      status,
      ...meta,
    });
  }

  async callRunpodSynthesize(
    job: TtsJob,
    requestId?: string,
  ): Promise<{ audioBase64?: string; error?: string; callbackSent?: boolean }> {
    const baseUrl = this.config.get('RUNPOD_TTS_BASE_URL', 'http://localhost:8001');
    const vpsUrl = this.config.get('VPS_CALLBACK_BASE_URL', 'http://host.docker.internal:3000');
    const url = `${baseUrl.replace(/\/$/, '')}/internal/v1/synthesize`;
    const callbackUrl = `${vpsUrl.replace(/\/$/, '')}/api/internal/v1/tts/upload-audio`;
    const timeout = 120_000;
    const startedAt = Date.now();

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeout);

    const payload = {
      job_id: job.id,
      tenant_id: job.tenantId,
      text: job.text,
      voice_id: job.voiceId ?? null,
      model: job.model ?? null,
      callback_url: callbackUrl,
    };
    const bodyStr = JSON.stringify(payload);
    const hmacSecret = this.config.get('RUNPOD_HMAC_SECRET', '');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (requestId) headers['X-Request-Id'] = requestId;
    if (hmacSecret) {
      Object.assign(headers, addHmacHeaders(headers, hmacSecret, 'POST', url, bodyStr));
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: bodyStr,
        signal: controller.signal,
      });
      clearTimeout(t);

      const data = (await res.json()) as {
        audio_base64?: string;
        error?: string;
        message?: string;
        callback_sent?: boolean;
        detail?: { error?: string; message?: string };
      };
      if (!res.ok) {
        const code =
          data.error ?? data.detail?.error ?? data.message ?? data.detail?.message ?? 'RUNPOD_ERROR';
        this.metrics.incError();
        this.metrics.observeTtsLatency(Date.now() - startedAt);
        logJson({
          event: 'runpod_call_failed',
          request_id: requestId,
          job_id: job.id,
          tenant_id: job.tenantId,
          latency_ms: Date.now() - startedAt,
          error_code: code,
        });
        return { error: code };
      }
      this.metrics.observeTtsLatency(Date.now() - startedAt);
      logJson({
        event: 'runpod_call_succeeded',
        request_id: requestId,
        job_id: job.id,
        tenant_id: job.tenantId,
        latency_ms: Date.now() - startedAt,
      });
      return {
        audioBase64: data.audio_base64,
        callbackSent: data.callback_sent,
      };
    } catch (e) {
      clearTimeout(t);
      const err = e as Error;
      this.metrics.incError();
      this.metrics.observeTtsLatency(Date.now() - startedAt);
      if (err.name === 'AbortError') {
        logJson({
          event: 'runpod_timeout',
          request_id: requestId,
          job_id: job.id,
          tenant_id: job.tenantId,
          latency_ms: Date.now() - startedAt,
          error_code: 'RUNPOD_TIMEOUT',
        });
        return { error: 'RUNPOD_TIMEOUT' };
      }
      logJson({
        event: 'runpod_unavailable',
        request_id: requestId,
        job_id: job.id,
        tenant_id: job.tenantId,
        latency_ms: Date.now() - startedAt,
        error_code: 'RUNPOD_UNAVAILABLE',
      });
      return { error: 'RUNPOD_UNAVAILABLE' };
    }
  }
}
