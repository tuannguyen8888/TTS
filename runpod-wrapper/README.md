# Runpod TTS Wrapper

API wrapper FastAPI + Uvicorn cho VieNeu-TTS, chạy trên Runpod Pod.

## Endpoints

- `GET /healthz` - Health check
- `GET /readyz` - Model đã load chưa
- `POST /internal/v1/synthesize` - Synthesize TTS (nhận từ VPS)

## Chạy local

```bash
cd runpod-wrapper
cp .env.example .env
uv run uvicorn app.main:app --host 0.0.0.0 --port 8001
```

Cần có VieNeu-TTS tại `../VieNeu-TTS` hoặc set `VIENEU_TTS_PATH`.

## Biến môi trường bảo mật (production)

- `RUNPOD_HMAC_SECRET_CURRENT`: secret hiện tại để verify request từ VPS.
- `RUNPOD_HMAC_SECRET_PREVIOUS` (optional): secret cũ chấp nhận tạm trong thời gian rotate key.
- `VPS_HMAC_SECRET_CURRENT`: secret hiện tại để ký callback về VPS.
- `VPS_HMAC_SECRET_PREVIOUS` (optional): không dùng để ký, chỉ lưu cho quy trình rotate đồng bộ nếu cần.
- `CALLBACK_ALLOWED_HOSTS`: danh sách host callback được phép, phân tách bằng dấu phẩy (ví dụ: `api.example.com,*.internal.example.com`).
- `ALLOW_INSECURE_CALLBACK_HTTP=false` (mặc định): chỉ cho phép callback `https`; đặt `true` cho môi trường dev đặc biệt.
