# CI/CD Demo Trên Runpod (Không Dùng Docker Hub)

Mục tiêu:

- `TTS Serverless GPU`: deploy qua **Runpod GitHub Integration** (trigger bằng GitHub Release)
- `CPU Pod`: deploy qua **GitHub Actions + SSH** (`backend + dashboard + postgres + redis`)

## 1. Các Workflow Đã Có

- `/.github/workflows/deploy-tts-serverless-runpod.yml`
- `/.github/workflows/deploy-demo-cpu-pod.yml`

## 2. TTS Serverless (Runpod GitHub Integration)

### Cách hoạt động

1. Bạn push code vào `main` (nếu có thay đổi trong `runpod-serverless/**`)
2. GitHub Actions tự tạo:
   - tag mới
   - GitHub prerelease mới
3. Runpod GitHub Integration phát hiện release mới và rebuild/update worker endpoint

### Cấu hình trong Runpod (làm 1 lần)

Trong Runpod Serverless endpoint:

1. Chọn source từ GitHub repo của bạn
2. Chỉ định Dockerfile path:
   - `runpod-serverless/Dockerfile`
3. Chọn branch:
   - `main`
4. Gắn `High Performance Storage` (Network Volume), mount:
   - `/runpod-volume`
5. Cấu hình env worker:
   - `VIENEU_MODE=standard`
   - `VIENEU_BACKBONE_REPO=pnnbao-ump/VieNeu-TTS-0.3B-q4-gguf`
   - `VIENEU_BACKBONE_DEVICE=gpu`
   - `VIENEU_CODEC_REPO=neuphonic/neucodec-onnx-decoder-int8`
   - `VIENEU_CODEC_DEVICE=cpu`
   - `HF_TOKEN=` (optional)

### GitHub permissions cần cho workflow release

Workflow `deploy-tts-serverless-runpod.yml` dùng `GITHUB_TOKEN` mặc định và cần:

- `Contents: Read and write`

Nếu repo đang bật “Read repository contents” mặc định, cần đổi tại:

- `Settings` -> `Actions` -> `General` -> `Workflow permissions`

## 3. CPU Pod Deploy Qua SSH (Backend + Dashboard + DB + Redis)

Workflow `deploy-demo-cpu-pod.yml` sẽ:

1. SSH vào máy/Pod CPU của bạn
2. `git pull` nhánh `main` (hoặc nhánh từ repo variable)
3. Chạy:
   - `docker compose -f docker-compose.yml -f docker-compose.demo.yml up -d --build`

### GitHub Secrets cần tạo (bắt buộc)

Tạo trong repo `Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`

- `DEPLOY_HOST`: IP/domain máy chạy CPU Pod
- `DEPLOY_PORT`: port SSH (ví dụ `22`)
- `DEPLOY_USER`: user SSH
- `DEPLOY_SSH_PRIVATE_KEY`: private key để SSH
- `DEPLOY_REPO_PATH`: đường dẫn repo trên máy đích (ví dụ `/opt/apps/TTS`)

### GitHub Variables (không nhạy cảm, optional)

Tạo trong `Variables`:

- `DEPLOY_BRANCH`: mặc định `main` nếu bỏ trống

## 4. Cấu hình máy đích (CPU Pod) trước khi bật auto deploy

Trên máy đích cần có:

1. Git clone repo vào đúng `DEPLOY_REPO_PATH`
2. Docker + Docker Compose plugin
3. File env demo:
   - `deploy/.env`
4. (Khuyến nghị) kiểm tra chạy tay 1 lần:
   - `docker compose -f docker-compose.yml -f docker-compose.demo.yml up -d --build`

## 5. Cấu hình `deploy/.env` cho CPU Pod (Demo Serverless)

Dùng mẫu:

- `deploy/.env.demo.runpod-serverless.example`

Các biến quan trọng cần điền thật:

- `RUNPOD_API_KEY`
- `RUNPOD_SERVERLESS_ENDPOINT_ID`
- `DASHBOARD_BASE_URL`
- `NEXT_PUBLIC_API_URL`
- `JWT_ACCESS_SECRET`
- `POSTGRES_PASSWORD`
- `SUPER_ADMIN_EMAIL`
- `SUPER_ADMIN_PASSWORD`

## 6. Lưu ý vận hành

- Workflow TTS chỉ trigger khi thay đổi `runpod-serverless/**`
- Workflow CPU Pod trigger khi thay đổi `backend/**`, `dashboard/**`, `deploy/**`
- Với demo live, nên đặt `min workers = 1` cho Runpod Serverless để giảm cold start
- Sau khi setup xong, nên rotate `RUNPOD_API_KEY` nếu từng paste vào chat/log
