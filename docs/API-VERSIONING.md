# Quy tắc API Versioning

- Public API: `/api/v1/*`
- Internal API (VPS-Runpod): `/api/internal/v1/*`

Khi có breaking change:
1. Tạo version mới (vd. v2)
2. Giữ v1 chạy song song tối thiểu 6 tháng
3. Thông báo deprecation trước khi gỡ v1
