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

type RunpodCallResult = {
  audioBase64?: string;
  error?: string;
  callbackSent?: boolean;
};

const RETRIABLE_RUNPOD_ERRORS = new Set([
  'RUNPOD_TIMEOUT',
  'RUNPOD_UNAVAILABLE',
  'RUNPOD_CALLBACK_FAILED',
]);

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
  ): Promise<RunpodCallResult> {
    if (this.getTtsProvider() === 'runpod_serverless') {
      return this.callRunpodServerlessSynthesize(job, requestId);
    }

    const baseUrl =
      this.config.get<string>('RUNPOD_TTS_BASE_URL') ?? 'http://localhost:8001';
    const vpsUrl =
      this.config.get<string>('VPS_CALLBACK_BASE_URL') ??
      'http://host.docker.internal:3000';
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
    const hmacSecret = this.getRunpodSigningSecret();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (requestId) headers['X-Request-Id'] = requestId;
    Object.assign(
      headers,
      addHmacHeaders(headers, hmacSecret, 'POST', url, bodyStr),
    );

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

  private async callRunpodServerlessSynthesize(
    job: TtsJob,
    requestId?: string,
  ): Promise<RunpodCallResult> {
    const endpointId = this.config
      .get<string>('RUNPOD_SERVERLESS_ENDPOINT_ID')
      ?.trim();
    const apiKey = this.config.get<string>('RUNPOD_API_KEY')?.trim();
    if (!endpointId || !apiKey) {
      return { error: 'RUNPOD_SERVERLESS_CONFIG_INVALID' };
    }

    const baseUrl =
      this.config.get<string>('RUNPOD_SERVERLESS_BASE_URL')?.trim() ??
      'https://api.runpod.ai/v2';
    const timeout = Number(
      this.config.get<string>('RUNPOD_SERVERLESS_TIMEOUT_MS') ?? '180000',
    );
    const timeoutMs = Number.isFinite(timeout) ? Math.max(1000, timeout) : 180_000;
    const url = `${baseUrl.replace(/\/$/, '')}/${endpointId}/runsync`;
    const startedAt = Date.now();

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    const payload = {
      input: {
        job_id: job.id,
        tenant_id: job.tenantId,
        text: job.text,
        voice_id: job.voiceId ?? null,
        model: job.model ?? null,
      },
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          ...(requestId ? { 'X-Request-Id': requestId } : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(t);

      const data = (await res.json()) as {
        status?: string;
        error?: string;
        message?: string;
        output?: {
          audio_base64?: string;
          audioBase64?: string;
          error?: string;
          message?: string;
        };
      };

      if (!res.ok) {
        const code =
          data.error ??
          data.message ??
          data.output?.error ??
          data.output?.message ??
          'RUNPOD_SERVERLESS_ERROR';
        this.metrics.incError();
        this.metrics.observeTtsLatency(Date.now() - startedAt);
        logJson({
          event: 'runpod_call_failed',
          provider: 'runpod_serverless',
          request_id: requestId,
          job_id: job.id,
          tenant_id: job.tenantId,
          latency_ms: Date.now() - startedAt,
          error_code: code,
        });
        return { error: code };
      }

      const audioBase64 = data.output?.audio_base64 ?? data.output?.audioBase64;
      if (!audioBase64) {
        const code =
          data.output?.error ??
          data.output?.message ??
          data.error ??
          data.message ??
          (data.status && data.status !== 'COMPLETED'
            ? `RUNPOD_SERVERLESS_${data.status}`
            : 'RUNPOD_EMPTY_OUTPUT');
        this.metrics.incError();
        this.metrics.observeTtsLatency(Date.now() - startedAt);
        logJson({
          event: 'runpod_call_failed',
          provider: 'runpod_serverless',
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
        provider: 'runpod_serverless',
        request_id: requestId,
        job_id: job.id,
        tenant_id: job.tenantId,
        latency_ms: Date.now() - startedAt,
      });
      return { audioBase64 };
    } catch (e) {
      clearTimeout(t);
      const err = e as Error;
      this.metrics.incError();
      this.metrics.observeTtsLatency(Date.now() - startedAt);
      if (err.name === 'AbortError') {
        logJson({
          event: 'runpod_timeout',
          provider: 'runpod_serverless',
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
        provider: 'runpod_serverless',
        request_id: requestId,
        job_id: job.id,
        tenant_id: job.tenantId,
        latency_ms: Date.now() - startedAt,
        error_code: 'RUNPOD_UNAVAILABLE',
      });
      return { error: 'RUNPOD_UNAVAILABLE' };
    }
  }

  private getRunpodSigningSecret(): string {
    const secret =
      this.config.get<string>('RUNPOD_HMAC_SECRET_CURRENT') ??
      this.config.get<string>('RUNPOD_HMAC_SECRET');
    if (!secret || secret.trim().length === 0) {
      throw new Error('RUNPOD_HMAC_SECRET_NOT_CONFIGURED');
    }
    return secret.trim();
  }

  private getTtsProvider(): string {
    return (
      this.config.get<string>('TTS_PROVIDER')?.trim().toLowerCase() ??
      'runpod_wrapper'
    );
  }

  async processRunpodJob(job: TtsJob, requestId?: string): Promise<RunpodCallResult> {
    const retryAttempts = this.getRetryAttempts();
    const retryBaseDelayMs = this.getRetryBaseDelayMs();
    let lastResult: RunpodCallResult = { error: 'RUNPOD_UNKNOWN' };

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      const result = this.normalizeRunpodResult(
        await this.callRunpodSynthesize(job, requestId),
      );
      lastResult = result;

      if (result.audioBase64 || result.callbackSent) {
        return result;
      }

      const shouldRetry =
        !!result.error &&
        RETRIABLE_RUNPOD_ERRORS.has(result.error) &&
        attempt < retryAttempts;
      if (!shouldRetry) {
        return result;
      }

      const delayMs = retryBaseDelayMs * 2 ** (attempt - 1);
      logJson({
        event: 'runpod_retry_scheduled',
        request_id: requestId,
        job_id: job.id,
        tenant_id: job.tenantId,
        error_code: result.error,
        retry_attempt: attempt,
        retry_delay_ms: delayMs,
      });
      await this.sleep(delayMs);
    }

    return lastResult;
  }

  private normalizeRunpodResult(result: RunpodCallResult): RunpodCallResult {
    if (result.callbackSent === false && !result.audioBase64 && !result.error) {
      return {
        ...result,
        error: 'RUNPOD_CALLBACK_FAILED',
      };
    }
    if (!result.audioBase64 && result.callbackSent !== true && !result.error) {
      return {
        ...result,
        error: 'RUNPOD_EMPTY_OUTPUT',
      };
    }
    return result;
  }

  private getRetryAttempts(): number {
    const raw = Number(this.config.get<string>('RUNPOD_RETRY_ATTEMPTS') ?? '3');
    if (!Number.isFinite(raw)) return 3;
    return Math.min(5, Math.max(1, Math.floor(raw)));
  }

  private getRetryBaseDelayMs(): number {
    const raw = Number(
      this.config.get<string>('RUNPOD_RETRY_BASE_DELAY_MS') ?? '1000',
    );
    if (!Number.isFinite(raw)) return 1000;
    return Math.min(10_000, Math.max(200, Math.floor(raw)));
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
