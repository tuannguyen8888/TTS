# TTS — Text-to-Speech SaaS

Hệ thống TTS (Text-to-Speech) tiếng Việt dạng SaaS: API backend, dashboard quản lý, engine VieNeu-TTS, wrapper chạy trên RunPod và tích hợp WordPress.

## Tổng quan

- **Backend (NestJS):** API public + internal, auth, tenant, API key, billing, usage, job TTS.
- **Dashboard (Next.js):** Giao diện quản lý tenant, API key, billing, usage.
- **VieNeu-TTS:** Engine TTS tiếng Việt (clone giọng, đa định dạng).
- **RunPod wrapper (FastAPI):** Wrapper VieNeu-TTS chạy trên RunPod Pod, nhận request từ VPS.
- **WordPress plugin:** Nút "Nghe bài viết" trên single post, gọi API backend.

## Cấu trúc repo

```
TTS/
├── backend/          # NestJS API (port 3000)
├── dashboard/        # Next.js dashboard (port 3001)
├── VieNeu-TTS/       # Engine TTS tiếng Việt (Python)
├── runpod-wrapper/   # FastAPI wrapper cho RunPod (port 8001)
├── integrations/
│   └── wordpress/
│       └── vieneu-tts-listen-post/   # Plugin "Nghe bài viết"
├── deploy/           # Dockerfile + docker-compose
└── docs/             # API versioning, OpenAPI
```

## Chạy nhanh (Docker Compose)

Backend + Dashboard + Postgres + Redis:

```bash
cd deploy
# chuẩn bị file deploy/.env với đầy đủ biến bắt buộc
docker compose up -d
```

- Backend API: http://localhost:3000  
- Dashboard: http://localhost:3001  
- Tài khoản super admin: được tạo từ `SUPER_ADMIN_EMAIL` và `SUPER_ADMIN_PASSWORD` trong biến môi trường (không có mặc định).

Chi tiết biến môi trường xem trong `deploy/docker-compose.yml`.

## Chạy từng phần (development)

### Backend

```bash
cd backend
cp .env.example .env   # chỉnh DATABASE_URL, REDIS_URL, ...
npm install
npm run start:dev
```

### Dashboard

```bash
cd dashboard
npm install
npm run dev
```

Cấu hình `NEXT_PUBLIC_API_URL` trỏ tới backend (vd. `http://localhost:3000/api`).

### RunPod wrapper (TTS worker)

Cần có VieNeu-TTS tại `../VieNeu-TTS` hoặc set `VIENEU_TTS_PATH`:

```bash
cd runpod-wrapper
uv run uvicorn app.main:app --host 0.0.0.0 --port 8001
```

- `GET /healthz` — health check  
- `GET /readyz` — model đã load chưa  
- `POST /internal/v1/synthesize` — synthesize (gọi từ VPS)

### VieNeu-TTS

Xem hướng dẫn đầy đủ trong [VieNeu-TTS/README.md](VieNeu-TTS/README.md) (cài đặt, Docker, fine-tune, model formats).

## API

- **Public:** `/api/v1/*` (synthesize, jobs, auth, usage, …)
- **Internal (VPS ↔ RunPod):** `/api/internal/v1/*`

Quy tắc versioning: [docs/API-VERSIONING.md](docs/API-VERSIONING.md).  
OpenAPI: [docs/openapi/tts-api-v1.yaml](docs/openapi/tts-api-v1.yaml).

## Tích hợp WordPress

Plugin **VieNeu TTS - Nghe bài viết** thêm nút nghe bài trên single post, gọi backend qua API key tenant.

- Cài đặt & cấu hình: [integrations/wordpress/vieneu-tts-listen-post/README.vi.md](integrations/wordpress/vieneu-tts-listen-post/README.vi.md)
- API Base URL cấu hình dạng: `https://your-vps-domain.com/api`

## License

- Backend, dashboard, runpod-wrapper, integrations: xem từng thư mục.
- VieNeu-TTS: [VieNeu-TTS/LICENSE](VieNeu-TTS/LICENSE).
