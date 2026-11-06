# VNR202 · Trạm Liên Lạc Bí Mật

Website ôn tập có 4 trạm, 15 câu hỏi và 8 tư liệu từ tài liệu dự án được cung cấp. HTML/CSS/JavaScript thuần, không cần cài dependencies hay build.

Chạy tại thư mục này:

```sh
python3 -m http.server 5173 --directory dist
```

Mở `http://localhost:5173`. Cần phục vụ qua HTTP vì JavaScript dùng ES modules.

## Triển khai trên Vercel

Import repo `Subzerozzz/vnr202-tram-lien-lac`, dùng Root Directory mặc định và Framework Preset **Other**. Không cần Install Command hay Build Command. File `vercel.json` đã cấu hình Output Directory là `dist`.

Mã nguồn không có cổng đăng nhập ChatGPT. Quyền truy cập bản triển khai được quản lý trong cài đặt Deployment Protection của Vercel.

## Cấu trúc mã nguồn

- `dist/index.html`: khung trang.
- `dist/styles.css`: giao diện, responsive và hiệu ứng.
- `dist/app.js`: luồng chơi, kiểm tra đáp án, tiến độ và âm thanh.
- `dist/content.js`: nội dung 4 trạm, 15 câu hỏi và 8 tư liệu.
- `dist/assets/`: font, favicon và giấy phép font.

## Tính năng

Luồng: chọn trạm → chọn đáp án → xác nhận → đúng/sai → mở từ khóa và giải thích → trạm tiếp theo. Tiến độ lưu trong localStorage trên trình duyệt, không đồng bộ tài khoản.

Có âm Morse, âm xác nhận, bản chép lời, giảm chuyển động, điều khiển bàn phím và giao diện mobile. Mỗi lần mở hoặc tải lại trang, âm thanh mặc định bật và thử tự phát. Nếu trình duyệt chặn autoplay, âm thanh tự bắt đầu sau thao tác đầu tiên ở bất kỳ đâu trên trang, không cần nút nghe riêng. Trang chủ và các trạm giải mã phát Morse nhỏ theo chu kỳ; nút loa toàn trang tắt cả tiếng vô tuyến, hiệu ứng và lời đọc, áp dụng trong lần mở trang hiện tại. Tải lại trang sẽ mặc định bật lại âm thanh. Tiếng vô tuyến tạm dừng khi đọc tổng kết, khi vào các trang khác hoặc khi ẩn tab.

Khi hoàn thành trạm và âm thanh đang bật, phần tổng kết được đọc sau tiếng xác nhận. Bộ đọc ưu tiên giọng tiếng Việt chất lượng cao khi thiết bị hỗ trợ, có chọn giọng và hai cách đọc: kể chuyện tự nhiên hoặc truyền tin trang trọng. Văn bản được chia thành câu, có nhịp nghỉ và chuẩn hóa cách đọc ngày tháng. Lời đọc vẫn dùng Speech Synthesis của trình duyệt; chất giọng phụ thuộc các giọng có trên thiết bị, không phải bản thu AI riêng.

Kiểm tra vòng đời âm thanh, lựa chọn giọng, nhịp nghỉ và việc hủy đọc:

```sh
node --test tests/audio.test.mjs
```

Nguồn: https://docs.google.com/document/d/1trfmfnYYsE-dckNZu7Rl5sQ_vogv55G8wu2EsDUNUi0/edit

Đây là trò chơi học tập, không phải hệ thống kiểm tra có giám sát. Đáp án được chứa trong mã phía trình duyệt. Huy hiệu ghi nhận tiến độ trong trò chơi, không phải chứng nhận môn học. Font từ Google Fonts có giấy phép OFL đi kèm tại `dist/assets/`.
