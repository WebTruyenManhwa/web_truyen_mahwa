# Web Truyện Manga

Dự án web đọc truyện manga với frontend NextJS và backend Ruby on Rails.

## Cấu trúc dự án

- `/frontend`: NextJS application
- `/backend`: Ruby on Rails API

## Yêu cầu

- Docker và Docker Compose
- Node.js 20+ (cho phát triển local)
- Ruby 3.3.0 (cho phát triển local)

## Khởi động dự án với Docker

Chạy toàn bộ hệ thống (frontend, backend và database):

```bash
./start.sh
```

Dừng hệ thống:

```bash
./stop.sh
```

## Truy cập các dịch vụ

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Database: PostgreSQL trên cổng 5432

## Phát triển

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
bundle install
rails db:create db:migrate
rails server
``` 