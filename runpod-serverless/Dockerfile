FROM nvidia/cuda:12.8.0-runtime-ubuntu24.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/runpod-volume/huggingface \
    PHONEMIZER_ESPEAK_LIBRARY=/usr/lib/x86_64-linux-gnu/libespeak-ng.so.1 \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH=/opt/venv/bin:$PATH \
    VIENEU_TTS_PATH=/workspace/VieNeu-TTS

# System deps for VieNeu-TTS and build wheels
RUN apt-get update && apt-get install -y --no-install-recommends \
    software-properties-common \
    && add-apt-repository ppa:deadsnakes/ppa \
    && apt-get update && apt-get install -y --no-install-recommends \
    python3.12 \
    python3.12-dev \
    build-essential \
    git \
    curl \
    ca-certificates \
    espeak-ng \
    libespeak-ng1 \
    && rm -rf /var/lib/apt/lists/*

RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.12 1 \
    && update-alternatives --install /usr/bin/python python /usr/bin/python3.12 1

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /workspace

# Copy serverless handler assets first (small layer)
COPY . /workspace/runpod-serverless

# Clone VieNeu-TTS source used by the handler. Pin branch/tag via build arg if needed.
ARG VIENEU_TTS_GIT_URL=https://github.com/pnnbao97/VieNeu-TTS.git
ARG VIENEU_TTS_GIT_REF=main
RUN git clone --depth 1 --branch ${VIENEU_TTS_GIT_REF} ${VIENEU_TTS_GIT_URL} /workspace/VieNeu-TTS

# Install VieNeu-TTS with GPU deps into /opt/venv
WORKDIR /workspace/VieNeu-TTS
RUN uv sync --no-dev --group gpu

# Install Runpod SDK / worker-only deps into same venv
WORKDIR /workspace
RUN uv pip install --python /opt/venv/bin/python -r /workspace/runpod-serverless/requirements.txt

CMD ["python", "/workspace/runpod-serverless/handler.py"]
