# Hướng Dẫn Cài Đặt và Đóng Gói Ứng Dụng Desktop Windows 💻

Tài liệu này hướng dẫn chi tiết từng bước để bạn tải mã nguồn từ Google AI Studio về máy tính cá nhân, chạy thử nghiệm (Development) và đóng gói thành một file chạy duy nhất định dạng `.exe` cho hệ điều hành Windows!

---

## 🎯 Các tính năng nổi bật của bản Desktop
1. **Ứng Dụng Độc Lập**: Giao diện gọn gàng, không có thanh địa chỉ trình duyệt, khởi động cực nhanh từ màn hình Desktop (Mặc định ẩn Menu Bar để tối ưu hóa không gian đọc truyện).
2. **Khởi Chạy Tiện Lợi**: Tự động kích hoạt song song máy chủ AI thông minh (Express) ngầm và giao diện hiển thị (Electron) mà không cần thao tác thủ công.
3. **Đóng Gói Chuyên Nghiệp**: Hỗ trợ xuất ra 2 dạng file cài đặt:
   - **Bản Portable (Chạy Liền)**: Chỉ một file duy nhất `.exe`, nhấn đúp chuột là dịch truyện ngay mà không cần cài đặt.
   - **Bản Setup (Cài Đặt)**: File setup chuyên nghiệp cho phép tùy chọn thư mục cài đặt, tự động tạo lối tắt (Shortcut) trên Desktop và Start Menu.

---

## 🛠️ Bước 1: Chuẩn bị Môi trường trên Windows
Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã được cài đặt:
1. **Node.js**: Phiên bản khuyến nghị là từ **v18+** trở lên.
   - *Tải về từ*: [https://nodejs.org/](https://nodejs.org/) (Chọn bản LTS).
2. **Trình soạn thảo mã nguồn (Tùy chọn)**: VS Code hoặc bất kỳ công cụ soạn thảo CSS/JS nào mà bạn thích.

---

## 📦 Bước 2: Tải Mã Nguồn từ Google AI Studio
1. Trong giao diện Google AI Studio Build, nhấn vào biểu tượng **Settings** (Răng cưa) hoặc nút xuất ứng dụng.
2. Chọn **Export to ZIP** để tải toàn bộ thư mục dự án này về máy tính của bạn.
3. Giải nén file `.zip` vừa tải xuống vào một thư mục làm việc (Ví dụ: `D:\AI-Manga-Translator`).

---

## 🔑 Bước 3: Cài đặt và cấu hình Key Gemini
1. Mở cửa sổ dòng lệnh (CMD hoặc PowerShell) tại thư mục vừa giải nén.
2. Chạy lệnh cài đặt tất cả các thư viện cần thiết:
   ```bash
   npm install
   ```
3. Tạo một file mới tên là `.env` ở thư mục gốc (nằm ngay cạnh `package.json`).
4. Mở file `.env` đó ra và dán khoá API Gemini của bạn vào theo định dạng sau:
   ```env
   GEMINI_API_KEY=AIzaSy...your_real_gemini_api_key_here
   ```
   *(Bạn có thể lấy key API miễn phí trực tiếp từ Google AI Studio).*

---

## 🚀 Bước 4: Chạy Thử Nghiệm Desktop trên Máy Tính
Để chạy thử ứng dụng trong môi trường thử nghiệm nhanh dành cho lập trình viên, hãy gõ lệnh:
```bash
npm run electron:dev
```
*Hệ thống sẽ tự động quét mã nguồn, biên dịch ứng dụng React & server Express, và khởi chạy một cửa sổ phần mềm Windows gọn gàng để bạn trải nghiệm dịch thử manga trực tiếp!*

---

## 🏗️ Bước 5: Đóng gói thành File `.exe` Windows
Khi bạn đã hài lòng và muốn tạo ra file cài đặt `.exe` để lưu trữ hoặc chia sẻ cho bạn bè sử dụng chuyên nghiệp:
1. Tại cửa sổ Command Prompt/PowerShell, chạy lệnh biên dịch và đóng gói tối ưu:
   ```bash
   npm run electron:build
   ```
2. Quá trình biên dịch sẽ tạo ra một thư mục mới có tên là `dist-desktop/`.
3. Truy cập vào thư mục `dist-desktop/`, bạn sẽ thấy các sản phẩm sau:
   - **`AI Manga Translator Setup 1.0.0.exe`**: Trình cài đặt chuyên nghiệp cho Windows (Cho phép cài đặt như các phần mềm thông thường khác, tự động tạo icon ở màn hình nền).
   - **`AI Manga Translator 1.0.0.exe` (trong thư mục con nếu chọn portable)**: Bản không cần cài đặt, copy đi đâu nhấn đúp là chạy được ngay!

---

*Chúc các bạn dịch truyện vui vẻ cùng Trình dịch truyện tranh thông minh tích hợp AI Gemini!* 🎉
