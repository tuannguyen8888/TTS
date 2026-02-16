type JsonLogPayload = {
  event: string;
  request_id?: string;
  job_id?: string;
  tenant_id?: string;
  latency_ms?: number;
  error_code?: string;
  [key: string]: unknown;
};

export function logJson(payload: JsonLogPayload) {
  const line = {
    timestamp: new Date().toISOString(),
    ...payload,
  };
  // One-line JSON logs for ingestion by log collectors.
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(line));
}

