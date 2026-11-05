# VNR202 · Trạm Liên Lạc Bí Mật

Website ôn tập có 4 trạm, 15 câu hỏi và 8 tư liệu từ tài liệu dự án được cung cấp. HTML/CSS/JavaScript thuần, không cần cài dependencies hay build.

Chạy tại thư mục này:

```sh
python3 -m http.server 5173 --directory dist
```

Mở `http://localhost:5173`. Cần phục vụ qua HTTP vì JavaScript dùng ES modules.

Luồng: chọn trạm → chọn đáp án → xác nhận → đúng/sai → mở từ khóa và giải thích → trạm tiếp theo. Tiến độ lưu trong localStorage trên trình duyệt, không đồng bộ tài khoản.

Có âm Morse, âm xác nhận, lời đọc dùng Speech Synthesis của trình duyệt, bản chép lời, giảm chuyển động, điều khiển bàn phím và giao diện mobile. Lời đọc phụ thuộc giọng tiếng Việt có trên thiết bị.

Nguồn: https://docs.google.com/document/d/1trfmfnYYsE-dckNZu7Rl5sQ_vogv55G8wu2EsDUNUi0/edit

Đây là trò chơi học tập, không phải hệ thống kiểm tra có giám sát. Đáp án được chứa trong mã phía trình duyệt. Huy hiệu ghi nhận tiến độ trong trò chơi, không phải chứng nhận môn học. Font từ Google Fonts có giấy phép OFL đi kèm tại `dist/assets/`.
