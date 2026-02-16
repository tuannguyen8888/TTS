#!/bin/sh
# Cache Hugging Face trong thư mục project (dễ gỡ bỏ)
export HF_HOME="$(cd "$(dirname "$0")" && pwd)/.cache/huggingface"
export TRANSFORMERS_CACHE="$HF_HOME"
export HUGGINGFACE_HUB_CACHE="$HF_HOME"

# Tắt hf-xet để tránh lỗi "Attempted to create a NULL object" trên macOS (dùng tải HF chuẩn)
export HF_HUB_DISABLE_XET=1
# Tắt hf_transfer trên Mac để tránh lỗi tải (khuyến nghị khi dùng GGUF)
export HF_HUB_ENABLE_HF_TRANSFER=0

# Tắt watermark ẩn trên audio (bỏ dấu bản quyền AI). Đặt =0 hoặc xóa dòng này nếu muốn bật lại.
export VIENEU_DISABLE_WATERMARK=1
