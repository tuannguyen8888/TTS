# Runpod Serverless TTS Worker (Demo)

Worker handler for Runpod Serverless GPU. It reuses `VieNeu-TTS` and returns `audio_base64` in the handler output so the NestJS backend can complete the job without callback.

## Expected Input

```json
{
  "input": {
    "job_id": "uuid",
    "tenant_id": "tenant-id",
    "text": "Xin chao",
    "voice_id": "Ly (nữ miền Bắc)",
    "model": null
  }
}
```

## Output

```json
{
  "job_id": "uuid",
  "audio_base64": "UklGR..."
}
```

On failure:

```json
{
  "job_id": "uuid",
  "error": "MODEL_ERROR",
  "message": "..."
}
```

## Notes

- This is a demo-oriented synchronous (`runsync`) worker contract.
- For production, prefer async jobs + callback/upload flow, retries, and stronger request authentication.

## Build Image (Demo)

Build from the `runpod-serverless` directory to keep Docker context small.

```bash
cd runpod-serverless
docker build -t your-dockerhub-user/vieneu-tts-runpod-serverless:demo .
docker push your-dockerhub-user/vieneu-tts-runpod-serverless:demo
```

Optional: pin a specific VieNeu-TTS branch/tag during build:

```bash
docker build \
  --build-arg VIENEU_TTS_GIT_REF=main \
  -t your-dockerhub-user/vieneu-tts-runpod-serverless:demo .
```

## Runpod Serverless Endpoint Settings (Demo)

Use a GPU template and set these env vars on the endpoint:

- `VIENEU_MODE=standard`
- `VIENEU_BACKBONE_REPO=pnnbao-ump/VieNeu-TTS-0.3B-q4-gguf`
- `VIENEU_BACKBONE_DEVICE=gpu`
- `VIENEU_CODEC_REPO=neuphonic/neucodec-onnx-decoder-int8`
- `VIENEU_CODEC_DEVICE=cpu`
- `HF_TOKEN=` (optional)

Recommended for smoother demo:

- Attach `High Performance Storage` (Network Volume) and keep default mount path `/runpod-volume`
- Set `min workers = 1` if you want to avoid cold start during live demo
- Warm the endpoint once before demo with a short sample text

## Backend Config (Demo Mode)

Set the backend to use Serverless instead of the old wrapper:

- `TTS_PROVIDER=runpod_serverless`
- `RUNPOD_API_KEY=<your-runpod-api-key>`
- `RUNPOD_SERVERLESS_ENDPOINT_ID=<endpoint-id>`
- `RUNPOD_SERVERLESS_BASE_URL=https://api.runpod.ai/v2`
- `RUNPOD_SERVERLESS_TIMEOUT_MS=180000`

The backend integration is implemented in:

- `backend/src/tts/tts.service.ts`
