import os
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel

# Add VieNeu-TTS to path (configurable via VIENEU_TTS_PATH)
VieneuPath = os.environ.get("VIENEU_TTS_PATH") or os.path.join(
    os.path.dirname(__file__), "..", "..", "VieNeu-TTS"
)
if os.path.exists(VieneuPath):
    sys.path.insert(0, VieneuPath)

tts_instance = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global tts_instance
    try:
        from vieneu import Vieneu
        tts_instance = Vieneu(
            mode="standard",
            backbone_repo="pnnbao-ump/VieNeu-TTS-0.3B-q4-gguf",
            backbone_device="cpu",
            codec_repo="neuphonic/neucodec-onnx-decoder-int8",
            codec_device="cpu",
        )
        print("VieNeu-TTS loaded")
    except Exception as e:
        print(f"VieNeu-TTS load failed: {e}")
        tts_instance = None
    yield
    tts_instance = None


app = FastAPI(title="Runpod TTS Wrapper", lifespan=lifespan)


class SynthesizeRequest(BaseModel):
    job_id: str
    tenant_id: str
    text: str
    voice_id: str | None = None
    model: str | None = None
    callback_url: str | None = None


def _sign_hmac(secret: str, payload_str: str, method: str, path: str) -> dict:
    import hashlib
    import hmac
    import time
    import uuid
    ts = str(int(time.time()))
    nonce = str(uuid.uuid4())
    body_hash = hashlib.sha256(payload_str.encode()).hexdigest()
    canonical = "\n".join([method, path, ts, nonce, body_hash])
    sig = hmac.new(secret.encode(), canonical.encode(), hashlib.sha256).hexdigest()
    return {"X-Hmac-Signature": sig, "X-Hmac-Timestamp": ts, "X-Hmac-Nonce": nonce}


def _post_callback(url: str, payload: dict) -> bool:
    import urllib.request
    import json
    from urllib.parse import urlparse
    payload_str = json.dumps(payload, sort_keys=True)
    headers = {"Content-Type": "application/json"}
    secret = os.environ.get("VPS_HMAC_SECRET", "")
    if secret:
        path = urlparse(url).path or "/"
        hdrs = _sign_hmac(secret, payload_str, "POST", path)
        headers.update(hdrs)
    request_id = payload.get("request_id")
    if request_id:
        headers["X-Request-Id"] = request_id
    try:
        req = urllib.request.Request(
            url,
            data=payload_str.encode(),
            headers=headers,
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status == 200
    except Exception as e:
        print(f"Callback failed: {e}")
        return False


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


@app.get("/readyz")
def readyz():
    return {"ready": tts_instance is not None}


@app.post("/internal/v1/synthesize")
async def synthesize(req: SynthesizeRequest, request: Request):
    # Optional HMAC verification for VPS -> Runpod
    secret = os.environ.get("RUNPOD_HMAC_SECRET", "")
    if secret:
        import hashlib
        import hmac

        sig = request.headers.get("x-hmac-signature")
        ts = request.headers.get("x-hmac-timestamp")
        nonce = request.headers.get("x-hmac-nonce")
        if not sig or not ts or not nonce:
            raise HTTPException(
                status_code=401,
                detail={"error": "INVALID_SIGNATURE", "message": "Missing HMAC headers"},
            )
        raw = await request.body()
        body_hash = hashlib.sha256(raw).hexdigest()
        canonical = "\n".join(
            ["POST", request.url.path, ts, nonce, body_hash]
        )
        expected = hmac.new(secret.encode(), canonical.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, sig):
            raise HTTPException(
                status_code=401,
                detail={"error": "INVALID_SIGNATURE", "message": "Bad signature"},
            )

    if tts_instance is None:
        raise HTTPException(
            status_code=503,
            detail={"error": "MODEL_NOT_LOADED", "message": "TTS model chưa sẵn sàng"},
        )

    voice_data = None
    if req.voice_id:
        try:
            voice_data = tts_instance.get_preset_voice(req.voice_id)
        except Exception:
            pass

    try:
        import numpy as np
        import io
        import wave

        audio = tts_instance.infer(req.text, voice=voice_data)
        buf = io.BytesIO()
        audio_int16 = (audio * 32767).clip(-32768, 32767).astype("int16")
        with wave.open(buf, "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(24000)
            wav.writeframes(audio_int16.tobytes())
        buf.seek(0)
        import base64
        b64 = base64.b64encode(buf.getvalue()).decode()
        request_id = request.headers.get("x-request-id")
        if req.callback_url:
            ok = _post_callback(
                req.callback_url,
                {"job_id": req.job_id, "audio_base64": b64, "request_id": request_id},
            )
            return {"job_id": req.job_id, "callback_sent": ok}
        return {"job_id": req.job_id, "audio_base64": b64}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": "MODEL_ERROR", "message": str(e)},
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
