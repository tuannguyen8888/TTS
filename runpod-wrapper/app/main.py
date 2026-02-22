import os
import sys
import time
from contextlib import asynccontextmanager
from ipaddress import ip_address
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel

# Add VieNeu-TTS to path (configurable via VIENEU_TTS_PATH)
VieneuPath = os.environ.get("VIENEU_TTS_PATH") or os.path.join(
    os.path.dirname(__file__), "..", "..", "VieNeu-TTS"
)
if os.path.exists(VieneuPath):
    sys.path.insert(0, VieneuPath)

tts_instance = None
seen_nonces: dict[str, int] = {}


def _get_secret_candidates(base_name: str) -> list[str]:
    raw_candidates = [
        os.environ.get(f"{base_name}_CURRENT", "").strip(),
        os.environ.get(f"{base_name}_PREVIOUS", "").strip(),
        os.environ.get(base_name, "").strip(),
    ]
    unique: list[str] = []
    for secret in raw_candidates:
        if secret and secret not in unique:
            unique.append(secret)
    return unique


def _get_signing_secret(base_name: str) -> str:
    current = os.environ.get(f"{base_name}_CURRENT", "").strip()
    legacy = os.environ.get(base_name, "").strip()
    secret = current or legacy
    if not secret:
        raise RuntimeError(f"{base_name}_CURRENT (or legacy {base_name}) is required")
    return secret


def _get_verification_secrets(base_name: str) -> list[str]:
    secrets = _get_secret_candidates(base_name)
    if not secrets:
        raise RuntimeError(
            f"{base_name}_CURRENT (or legacy {base_name}) is required"
        )
    return secrets


def _get_callback_allowed_hosts() -> list[str]:
    raw = os.environ.get("CALLBACK_ALLOWED_HOSTS", "").strip()
    if not raw:
        return []
    return [host.strip().lower() for host in raw.split(",") if host.strip()]


def _is_host_allowed(hostname: str, allowed_hosts: list[str]) -> bool:
    for rule in allowed_hosts:
        if rule.startswith("*."):
            suffix = rule[2:]
            if hostname == suffix or hostname.endswith(f".{suffix}"):
                return True
            continue
        if hostname == rule:
            return True
    return False


def _validate_callback_url(callback_url: str) -> None:
    parsed = urlparse(callback_url)
    scheme = parsed.scheme.lower()
    if scheme not in ("https", "http"):
        raise HTTPException(
            status_code=400,
            detail={"error": "INVALID_CALLBACK_URL", "message": "Invalid callback scheme"},
        )

    allow_insecure_http = (
        os.environ.get("ALLOW_INSECURE_CALLBACK_HTTP", "false").lower() == "true"
    )
    if scheme == "http" and not allow_insecure_http:
        raise HTTPException(
            status_code=400,
            detail={"error": "INVALID_CALLBACK_URL", "message": "HTTP callback is not allowed"},
        )

    hostname = (parsed.hostname or "").strip().lower()
    if not hostname:
        raise HTTPException(
            status_code=400,
            detail={"error": "INVALID_CALLBACK_URL", "message": "Missing callback host"},
        )

    try:
        ip = ip_address(hostname)
        if ip.is_private or ip.is_loopback or ip.is_link_local:
            raise HTTPException(
                status_code=400,
                detail={"error": "INVALID_CALLBACK_URL", "message": "Private callback host is blocked"},
            )
    except ValueError:
        pass

    allowed_hosts = _get_callback_allowed_hosts()
    if not allowed_hosts:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "CALLBACK_ALLOWLIST_NOT_CONFIGURED",
                "message": "CALLBACK_ALLOWED_HOSTS is required when callback_url is used",
            },
        )

    if not _is_host_allowed(hostname, allowed_hosts):
        raise HTTPException(
            status_code=400,
            detail={"error": "CALLBACK_URL_NOT_ALLOWED", "message": "Callback host is not allowlisted"},
        )


def _purge_expired_nonces(now_epoch_sec: int) -> None:
    expired = [nonce for nonce, exp in seen_nonces.items() if exp <= now_epoch_sec]
    for nonce in expired:
        seen_nonces.pop(nonce, None)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global tts_instance
    _get_verification_secrets("RUNPOD_HMAC_SECRET")
    _get_signing_secret("VPS_HMAC_SECRET")
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
    payload_str = json.dumps(payload, sort_keys=True)
    headers = {"Content-Type": "application/json"}
    secret = _get_signing_secret("VPS_HMAC_SECRET")
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
    import hashlib
    import hmac

    verification_secrets = _get_verification_secrets("RUNPOD_HMAC_SECRET")
    sig = request.headers.get("x-hmac-signature")
    ts = request.headers.get("x-hmac-timestamp")
    nonce = request.headers.get("x-hmac-nonce")
    if not sig or not ts or not nonce:
        raise HTTPException(
            status_code=401,
            detail={"error": "INVALID_SIGNATURE", "message": "Missing HMAC headers"},
        )
    try:
        req_ts = int(ts)
    except ValueError as exc:
        raise HTTPException(
            status_code=401,
            detail={"error": "EXPIRED_TIMESTAMP", "message": "Invalid timestamp"},
        ) from exc
    now = int(time.time())
    if abs(now - req_ts) > 300:
        raise HTTPException(
            status_code=401,
            detail={"error": "EXPIRED_TIMESTAMP", "message": "Timestamp too old"},
        )
    _purge_expired_nonces(now)
    if nonce in seen_nonces:
        raise HTTPException(
            status_code=401,
            detail={"error": "REPLAY_DETECTED", "message": "Nonce already used"},
        )
    raw = await request.body()
    body_hash = hashlib.sha256(raw).hexdigest()
    canonical = "\n".join(
        ["POST", request.url.path, ts, nonce, body_hash]
    )
    signature_valid = False
    for secret in verification_secrets:
        expected = hmac.new(secret.encode(), canonical.encode(), hashlib.sha256).hexdigest()
        if hmac.compare_digest(expected, sig):
            signature_valid = True
            break
    if not signature_valid:
        raise HTTPException(
            status_code=401,
            detail={"error": "INVALID_SIGNATURE", "message": "Bad signature"},
        )
    seen_nonces[nonce] = now + 300

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
            _validate_callback_url(req.callback_url)
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
