# README

This README would normally document whatever steps are necessary to get the
application up and running.

Things you may want to cover:

* Ruby version

* System dependencies

* Configuration

* Database creation

* Database initialization

* How to run the test suite

* Services (job queues, cache servers, search engines, etc.)

* Deployment instructions

* ...

chạy test api
curl -i http://localhost:3001/api/v1/mangas
curl -i http://10.50.80.163:3001/api/v1/mangas
curl http://localhost:3000

## AI Analytics

Hệ thống sử dụng Google Gemini API để phân tích dữ liệu:

### Google Gemini API

Gemini là mô hình AI mới nhất từ Google, cung cấp khả năng phân tích dữ liệu mạnh mẽ.

Cấu hình:
```
GEMINI_API_KEY=AIzaxxxxxxxxxxxxxxxxxxxxxxx  # Bắt buộc
```

### Cách hoạt động

Hệ thống sử dụng Gemini API để phân tích dữ liệu và đưa ra các đề xuất. Nếu không có API key, hệ thống sẽ trả về thông báo lỗi.
