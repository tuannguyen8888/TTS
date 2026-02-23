#!/usr/bin/env bash
set -euo pipefail

# End-to-end smoke test:
# 1) Create TTS job via backend API
# 2) Poll job status until completed/failed
# 3) Save returned audio (data URL) to a local .wav file

BASE_URL="${BASE_URL:-https://pi4vzjd5tox8gf-8001.proxy.runpod.net}"
API_KEY="${TTS_API_KEY:-${1:-}}"
TEXT="${TEXT:-Xin chao, day la bai kiem tra end to end tren Runpod.}"
VOICE_ID="${VOICE_ID:-}"
MODEL="${MODEL:-}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-180}"
POLL_INTERVAL_SECONDS="${POLL_INTERVAL_SECONDS:-3}"
OUT_DIR="${OUT_DIR:-/tmp/tts-smoke}"
REQUEST_IDEMPOTENCY_KEY="${IDEMPOTENCY_KEY:-smoke-$(date +%s)}"

if [[ -z "$API_KEY" ]]; then
  echo "Thiếu API key. Dùng 1 trong 2 cách:"
  echo "  TTS_API_KEY=<tenant_api_key> $0"
  echo "  $0 <tenant_api_key>"
  exit 1
fi

mkdir -p "$OUT_DIR"

api_call() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  local tmp_body http_code
  tmp_body="$(mktemp)"

  if [[ -n "$body" ]]; then
    http_code="$(
      curl -sS -X "$method" "$url" \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json" \
        --data "$body" \
        -o "$tmp_body" \
        -w '%{http_code}'
    )"
  else
    http_code="$(
      curl -sS -X "$method" "$url" \
        -H "Authorization: Bearer $API_KEY" \
        -o "$tmp_body" \
        -w '%{http_code}'
    )"
  fi

  if [[ "$http_code" -lt 200 || "$http_code" -ge 300 ]]; then
    echo "HTTP $http_code từ $url" >&2
    cat "$tmp_body" >&2 || true
    rm -f "$tmp_body"
    return 1
  fi

  cat "$tmp_body"
  rm -f "$tmp_body"
}

json_get() {
  local key="$1"
  python3 -c '
import json, sys
key = sys.argv[1]
try:
    data = json.load(sys.stdin)
except Exception:
    print("")
    raise
value = data
for part in key.split("."):
    if not isinstance(value, dict):
        value = None
        break
    value = value.get(part)
if value is None:
    print("")
elif isinstance(value, (dict, list)):
    print(json.dumps(value, ensure_ascii=False))
else:
    print(value)
' "$key"
}

build_payload() {
  python3 - <<PY
import json
payload = {
  "text": ${TEXT@Q},
  "idempotencyKey": ${REQUEST_IDEMPOTENCY_KEY@Q},
}
voice = ${VOICE_ID@Q}
model = ${MODEL@Q}
if voice:
    payload["voiceId"] = voice
if model:
    payload["model"] = model
print(json.dumps(payload, ensure_ascii=False))
PY
}

echo "==> Tạo TTS job"
payload="$(build_payload)"
create_json="$(api_call POST "$BASE_URL/api/v1/tts/synthesize" "$payload")"
echo "$create_json"

job_id="$(printf '%s' "$create_json" | json_get "job_id")"
status="$(printf '%s' "$create_json" | json_get "status")"

if [[ -z "$job_id" ]]; then
  echo "Không lấy được job_id từ response tạo job." >&2
  exit 1
fi

echo "==> Poll job: $job_id (status ban đầu: ${status:-unknown})"
start_ts="$(date +%s)"

while true; do
  now_ts="$(date +%s)"
  elapsed=$(( now_ts - start_ts ))
  if (( elapsed > TIMEOUT_SECONDS )); then
    echo "Timeout sau ${TIMEOUT_SECONDS}s khi chờ job $job_id" >&2
    exit 1
  fi

  job_json="$(api_call GET "$BASE_URL/api/v1/tts/jobs/$job_id")"
  status="$(printf '%s' "$job_json" | json_get "status")"
  echo "[$elapsed s] status=$status"

  if [[ "$status" == "completed" ]]; then
    audio_url="$(printf '%s' "$job_json" | json_get "audio_url")"
    if [[ "$audio_url" != data:audio/*base64,* ]]; then
      echo "Job completed nhưng audio_url không phải data URL như kỳ vọng." >&2
      echo "$job_json" >&2
      exit 1
    fi
    out_file="$OUT_DIR/tts-smoke-${job_id}.wav"
    python3 - "$audio_url" "$out_file" <<'PY'
import base64, sys
audio_url = sys.argv[1]
out_file = sys.argv[2]
try:
    b64 = audio_url.split(",", 1)[1]
except IndexError:
    raise SystemExit("Invalid data URL")
with open(out_file, "wb") as f:
    f.write(base64.b64decode(b64))
print(out_file)
PY
    echo "==> Thành công. Audio lưu tại: $out_file"
    exit 0
  fi

  if [[ "$status" == "failed" ]]; then
    error_code="$(printf '%s' "$job_json" | json_get "error_code")"
    error_message="$(printf '%s' "$job_json" | json_get "error_message")"
    echo "==> Job failed: ${error_code:-UNKNOWN} - ${error_message:-}" >&2
    echo "$job_json" >&2
    exit 1
  fi

  sleep "$POLL_INTERVAL_SECONDS"
done
