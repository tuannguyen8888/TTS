# Hướng dẫn cài đặt và sử dụng plugin `VieNeu TTS - Nghe bài viết`

Tài liệu này hướng dẫn:

- Cách cài plugin vào WordPress
- Cách đóng gói để phân phối cho khách hàng
- Cấu hình kết nối tới backend TTS
- Cách sử dụng và xử lý lỗi thường gặp

---

## 1) Plugin này làm gì?

Plugin thêm nút **"Nghe bài viết"** ở trang chi tiết bài viết (single post).  
Khi người dùng bấm nút:

1. Plugin gọi server-side AJAX trong WordPress (`admin-ajax.php`)
2. WordPress gọi API VPS:
   - `POST /v1/tts/synthesize` để tạo job
   - `GET /v1/tts/jobs/{jobId}` để polling trạng thái
3. Khi job `completed`, plugin hiển thị `<audio controls ...>` để phát

API key tenant được giữ ở server WordPress (không lộ ra frontend JS).

---

## 2) Yêu cầu trước khi cài

- WordPress có quyền cài plugin
- Backend VPS đang chạy và có các endpoint:
  - `POST /api/v1/tts/synthesize`
  - `GET /api/v1/tts/jobs/{jobId}`
- Có API key tenant hợp lệ từ dashboard

Lưu ý: trong trang cấu hình plugin, trường API Base URL nên là:

- `https://your-vps-domain.com/api`

Plugin sẽ tự gọi thêm phần `/v1/...`.

---

## 3) Cài plugin (2 cách)

## Cách A - Cài trực tiếp từ source

1. Copy thư mục:
   - `integrations/wordpress/vieneu-tts-listen-post/`
2. Dán vào:
   - `wp-content/plugins/vieneu-tts-listen-post/`
3. Vào WordPress Admin -> `Plugins`
4. Bấm **Activate** plugin `VieNeu TTS - Nghe bài viết`

## Cách B - Cài qua file ZIP (khuyến nghị để phân phối)

Bạn nên đóng gói ZIP khi phân phối cho khách hàng.

Ví dụ chạy tại root dự án:

```bash
cd integrations/wordpress
zip -r vieneu-tts-listen-post.zip vieneu-tts-listen-post
```

Sau đó:

1. Vào WordPress Admin -> `Plugins` -> `Add New` -> `Upload Plugin`
2. Chọn `vieneu-tts-listen-post.zip`
3. Install + Activate

---

## 4) Cấu hình plugin

Vào:

- `Settings` -> `VieNeu TTS`

Các trường:

- **API Base URL**: URL API của VPS, ví dụ `https://your-vps-domain.com/api`
- **API Key (Tenant)**: key dạng `vntts_...`
- **Voice ID (mặc định)**: để trống nếu dùng voice mặc định server
- **Bật nút**: bật/tắt hiển thị nút "Nghe bài viết"

Sau khi nhập xong, bấm **Save Changes**.

---

## 5) Cách sử dụng

1. Mở một bài viết dạng single post
2. Nút **"Nghe bài viết"** sẽ xuất hiện ở đầu nội dung
3. Bấm nút:
   - Nút đổi sang `Đang xử lý...`
   - Plugin tạo job TTS
   - Plugin polling trạng thái định kỳ
4. Khi hoàn tất, player audio xuất hiện để phát

---

## 6) Bảo mật và vận hành

- API key không gửi trực tiếp từ browser tới VPS
- Browser chỉ gọi WordPress AJAX
- WordPress server mới dùng API key để gọi VPS
- Plugin gửi `X-Request-Id` để hỗ trợ correlation/tracing

Khuyến nghị:

- Dùng HTTPS cho site WordPress và VPS API
- Nếu API key lộ, revoke key cũ và tạo key mới trên dashboard

---

## 7) Troubleshooting nhanh

## Nút không xuất hiện

- Kiểm tra đang ở `single post` chưa
- Kiểm tra tùy chọn **Bật nút** trong Settings
- Kiểm tra theme có chạy `the_content` filter hay không

## Bấm nút báo "Chưa cấu hình API"

- Chưa nhập API Base URL / API Key
- Hoặc giá trị lưu bị rỗng

## Bấm nút nhưng fail job

- Kiểm tra API key còn active không
- Kiểm tra backend log (`RUNPOD_UNAVAILABLE`, timeout, HMAC fail...)
- Kiểm tra endpoint VPS có truy cập được từ server WordPress

## Player không phát được

- Kiểm tra `audio_url` trả về có hợp lệ
- Kiểm tra browser policy (autoplay) và CORS nếu dùng URL file ngoài

---

## 8) Gợi ý phân phối bản phát hành

Mỗi bản release nên có:

- `vieneu-tts-listen-post.zip`
- `README.vi.md` (file này)
- `CHANGELOG.md` (nên thêm)

Quy tắc version:

- Sửa bug: tăng patch (`0.1.0` -> `0.1.1`)
- Thêm tính năng không breaking: tăng minor (`0.1.0` -> `0.2.0`)
- Breaking change: tăng major (`1.x.x`)

