# Deploy Demo Trên Runpod (CPU Pod + TTS Serverless GPU)

Mục tiêu:

- `Backend + Dashboard + Postgres + Redis` chạy trong **1 Pod CPU** (always-on)
- `TTS` chạy trên **Runpod Serverless GPU**
- Backend gọi `runsync` của Serverless và nhận `audio_base64` trực tiếp

## 1. Chuẩn bị Backend/Dashboard (CPU Pod)

Sử dụng:

- `deploy/docker-compose.yml` (base)
- `deploy/docker-compose.demo.yml` (override cho demo)

### Cấu hình `deploy/.env`

Các biến bắt buộc cho demo:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_ACCESS_SECRET`
- `DASHBOARD_BASE_URL`
- `NEXT_PUBLIC_API_URL`
- `TTS_PROVIDER=runpod_serverless`
- `RUNPOD_API_KEY=<Runpod API key>`
- `RUNPOD_SERVERLESS_ENDPOINT_ID=<endpoint-id>`
- `RUNPOD_SERVERLESS_BASE_URL=https://api.runpod.ai/v2`
- `RUNPOD_SERVERLESS_TIMEOUT_MS=180000`

Gợi ý demo nhanh:

- `TYPEORM_SYNCHRONIZE=true` (chỉ demo/fresh DB)
- `SUPER_ADMIN_EMAIL=<email>`
- `SUPER_ADMIN_PASSWORD=<password>`

Lưu ý:

- Các biến `RUNPOD_HMAC_SECRET_*` và `VPS_HMAC_SECRET_*` vẫn đang được yêu cầu trong compose hiện tại.
- Với mode `runpod_serverless`, backend không dùng callback HMAC cho luồng demo, nhưng bạn vẫn cần set giá trị dummy/real để container khởi động do compose đang đánh dấu required.

## 2. Chạy CPU Pod

Trong Pod CPU (hoặc VM/container host), chạy:

```bash
cd deploy
cp .env.demo.runpod-serverless.example .env
# chỉnh lại các biến thật: RUNPOD_API_KEY, RUNPOD_SERVERLESS_ENDPOINT_ID, domain, secrets...
docker compose -f docker-compose.yml -f docker-compose.demo.yml up -d --build
```

Kiểm tra:

- Backend health: `GET /healthz`
- Dashboard mở được trang login

Khuyến nghị demo:

- Chỉ public các port web (`3000`, `3001`)
- `Postgres/Redis` trong `deploy/docker-compose.yml` đã để internal-only (không public)

## 3. Build Image TTS Serverless GPU

Worker code nằm ở thư mục `runpod-serverless/`.

```bash
cd runpod-serverless
docker build -t <docker-user>/vieneu-tts-runpod-serverless:demo .
docker push <docker-user>/vieneu-tts-runpod-serverless:demo
```

Image này sẽ:

- clone `VieNeu-TTS` từ GitHub
- cài dependency GPU bằng `uv`
- chạy `handler.py` với Runpod SDK

## 4. Tạo Runpod Serverless GPU Endpoint

Trên Runpod:

1. Tạo `Serverless Endpoint` (GPU)
2. Chọn image: `<docker-user>/vieneu-tts-runpod-serverless:demo`
3. Attach `High Performance Storage` (Network Volume), mount `/runpod-volume`
4. Set env vars:

- `VIENEU_MODE=standard`
- `VIENEU_BACKBONE_REPO=pnnbao-ump/VieNeu-TTS-0.3B-q4-gguf`
- `VIENEU_BACKBONE_DEVICE=gpu`
- `VIENEU_CODEC_REPO=neuphonic/neucodec-onnx-decoder-int8`
- `VIENEU_CODEC_DEVICE=cpu`
- `HF_TOKEN=` (optional)

Khuyến nghị demo:

- `min workers = 1` nếu muốn giảm cold start khi demo live

## 5. Nối Backend -> Serverless

Backend đã hỗ trợ provider mới tại:

- `backend/src/tts/tts.service.ts`

Luồng demo:

1. Backend tạo job TTS
2. Backend gọi `POST https://api.runpod.ai/v2/<endpoint-id>/runsync`
3. Worker trả `output.audio_base64`
4. Backend cập nhật job `completed`

## 6. Smoke Test Demo

1. Login dashboard
2. Tạo API key tenant
3. Gọi `POST /api/v1/tts/synthesize`
4. Poll `GET /api/v1/tts/jobs/:jobId`
5. Xác nhận `status=completed` và `audio_url` có `data:audio/wav;base64,...`

## 7. Các Rủi Ro Demo (chấp nhận được)

- TTS Serverless có cold start nếu `min workers = 0`
- CPU Pod là single point of failure
- `TYPEORM_SYNCHRONIZE=true` chỉ dùng cho demo, không dùng production
