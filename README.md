# SpineVDT — Công cụ Ghép & Xuất Ảnh Động Spine 4.2

![SpineVDT Banner](docs/banner.jpg)

**SpineVDT** là công cụ web cục bộ (Node.js + Spine WebGL 4.2 + FFmpeg) giúp xem trước, ghép khung/avatar và xuất ảnh động hoặc video trong suốt từ bộ file Spine (`.json`, `.skel`, `.atlas`, `.png`).

---

## Tính năng chính

- **Nạp nguồn Spine linh hoạt**:
  - Tự động quét bộ file Spine trong thư mục làm việc.
  - Chọn cả thư mục, kéo-thả file (`.json` / `.skel`, `.atlas` / `.atlas.txt`, `.png`) hoặc nạp trực tiếp từ URL.
- **Điều khiển hiển thị & hoạt ảnh**:
  - Chọn **Animation**, **Skin**, điều chỉnh tốc độ phát (`0.25x` – `2.0x`) và thanh timeline.
  - Bật/tắt từng **Slot** (bộ phận) riêng lẻ.
- **Chỉnh khung & bố cục trực quan**:
  - Chọn kích thước xuất (`256×256` đến `2048×2048`) hoặc **Tuỳ chỉnh (Rộng × Cao)** từ `64` đến `4096` px.
  - Kéo trực tiếp góc dưới-phải khung xem trước để đổi kích thước khung, giữ chuột kéo để dịch chuyển X/Y, lăn chuột để phóng to/thu nhỏ (`0.05x` – `5x`).
  - Hỗ trợ nền xem trước: Caro trong suốt, Tối, Sáng, Phông xanh.
- **Ghép ảnh Avatar (tuỳ chọn)**:
  - Ghép ảnh đại diện hình tròn hoặc hình vuông vào giữa khung, tuỳ chỉnh kích thước `5%` – `150%`.
- **Xuất file & chọn nơi lưu trực tiếp**:
  - Hỗ trợ xuất **GIF động (trong suốt)**, **WebM (video trong suốt)**, **APNG**, **MP4 (H.264)** và **Chuỗi ảnh PNG** ở `24` / `30` / `60` fps.
  - Mở hộp thoại chọn thư mục/tên file để lưu trực tiếp về máy.

---

## Sản phẩm đầu ra mẫu

| Khung Giáng Sinh (PNG/APNG) | Mẫu `hwjy_tx_wj` (1) | Mẫu `hwjy_tx_wj` (2) |
| :---: | :---: | :---: |
| ![Khung mẫu](docs/sample_frame.png) | ![hwjy_tx_wj 1](docs/outputs/hwjy_tx_wj_2026-11-25T18-15-04.gif) | ![hwjy_tx_wj 2](docs/outputs/hwjy_tx_wj_2026-11-25T18-34-22.gif) |

| Mẫu `TXK` (1) | Mẫu `TXK` (2) |
| :---: | :---: |
| ![TXK 1](docs/outputs/TXK_2026-11-25T19-03-57.gif) | ![TXK 2](docs/outputs/TXK_2026-11-25T19-05-35.gif) |

---

## Yêu cầu & Cách chạy

1. Cài đặt **Node.js** và **FFmpeg** (đã thêm `ffmpeg` vào `PATH` hệ thống).
2. Cài đặt package:
   ```bash
   npm install
   ```
3. Khởi chạy công cụ:
   - Trên Windows: nhấn đúp **`start_tool.bat`**, hoặc chạy lệnh:
     ```bash
     node server.js
     ```
4. Mở trình duyệt (Chrome / Edge) tại:
   ```text
   http://127.0.0.1:3456
   ```
