# Runpod TTS Wrapper

API wrapper FastAPI + Uvicorn cho VieNeu-TTS, chạy trên Runpod Pod.

## Endpoints

- `GET /healthz` - Health check
- `GET /readyz` - Model đã load chưa
- `POST /internal/v1/synthesize` - Synthesize TTS (nhận từ VPS)

## Chạy local

```bash
cd runpod-wrapper
uv run uvicorn app.main:app --host 0.0.0.0 --port 8001
```

Cần có VieNeu-TTS tại `../VieNeu-TTS` hoặc set `VIENEU_TTS_PATH`.
