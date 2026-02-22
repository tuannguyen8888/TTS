import base64
import io
import os
import sys
import wave
from typing import Any

import runpod


def _ensure_vieneu_path() -> None:
  vieneu_path = os.environ.get("VIENEU_TTS_PATH", "/workspace/VieNeu-TTS")
  if vieneu_path and os.path.exists(vieneu_path) and vieneu_path not in sys.path:
    sys.path.insert(0, vieneu_path)


_tts_instance = None


def _get_tts():
  global _tts_instance
  if _tts_instance is not None:
    return _tts_instance

  _ensure_vieneu_path()
  from vieneu import Vieneu

  _tts_instance = Vieneu(
    mode=os.environ.get("VIENEU_MODE", "standard"),
    backbone_repo=os.environ.get(
      "VIENEU_BACKBONE_REPO", "pnnbao-ump/VieNeu-TTS-0.3B-q4-gguf"
    ),
    backbone_device=os.environ.get("VIENEU_BACKBONE_DEVICE", "gpu"),
    codec_repo=os.environ.get(
      "VIENEU_CODEC_REPO", "neuphonic/neucodec-onnx-decoder-int8"
    ),
    codec_device=os.environ.get("VIENEU_CODEC_DEVICE", "cpu"),
    hf_token=os.environ.get("HF_TOKEN") or None,
  )
  return _tts_instance


def _wav_to_base64(audio) -> str:
  import numpy as np

  buf = io.BytesIO()
  audio_int16 = (audio * 32767).clip(-32768, 32767).astype(np.int16)
  with wave.open(buf, "wb") as wav:
    wav.setnchannels(1)
    wav.setsampwidth(2)
    wav.setframerate(24000)
    wav.writeframes(audio_int16.tobytes())
  return base64.b64encode(buf.getvalue()).decode()


def handler(job: dict[str, Any]) -> dict[str, Any]:
  payload = (job or {}).get("input") or {}
  job_id = str(payload.get("job_id") or "")
  text = str(payload.get("text") or "").strip()
  voice_id = payload.get("voice_id")

  if not text:
    return {"error": "INVALID_INPUT", "message": "text is required"}

  try:
    tts = _get_tts()
    voice_data = None
    if voice_id:
      try:
        voice_data = tts.get_preset_voice(str(voice_id))
      except Exception:
        voice_data = None

    audio = tts.infer(text, voice=voice_data)
    return {
      "job_id": job_id,
      "audio_base64": _wav_to_base64(audio),
    }
  except Exception as exc:
    return {
      "job_id": job_id,
      "error": "MODEL_ERROR",
      "message": str(exc),
    }


runpod.serverless.start({"handler": handler})
