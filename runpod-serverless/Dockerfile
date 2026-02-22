FROM nvidia/cuda:12.8.0-runtime-ubuntu24.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/runpod-volume/huggingface \
    PHONEMIZER_ESPEAK_LIBRARY=/usr/lib/x86_64-linux-gnu/libespeak-ng.so.1 \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH=/opt/venv/bin:$PATH \
    VIENEU_TTS_PATH=/workspace/VieNeu-TTS

# System deps for VieNeu-TTS and Python runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-dev \
    python3-pip \
    python3-venv \
    build-essential \
    git \
    curl \
    ca-certificates \
    espeak-ng \
    libespeak-ng1 \
    && rm -rf /var/lib/apt/lists/*

RUN ln -sf /usr/bin/python3 /usr/bin/python \
    && python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir --upgrade pip uv

WORKDIR /workspace

WORKDIR /workspace/runpod-serverless
COPY . .

# Clone VieNeu-TTS source used by the handler. Pin branch/tag via build arg if needed.
ARG VIENEU_TTS_GIT_URL=https://github.com/pnnbao97/VieNeu-TTS.git
ARG VIENEU_TTS_GIT_REF=main
RUN git clone --depth 1 --branch ${VIENEU_TTS_GIT_REF} ${VIENEU_TTS_GIT_URL} /workspace/VieNeu-TTS

# Install VieNeu-TTS with GPU deps into /opt/venv
WORKDIR /workspace/VieNeu-TTS
RUN uv sync --no-dev --group gpu

# Install Runpod SDK / worker-only deps into same venv
WORKDIR /workspace/runpod-serverless
RUN uv pip install --python /opt/venv/bin/python -r requirements.txt

CMD ["python", "handler.py"]
