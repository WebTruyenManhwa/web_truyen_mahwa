# Tối ưu hóa GraphQL API với Nginx

## Giới thiệu

Tài liệu này hướng dẫn cách sử dụng Nginx làm reverse proxy và caching layer cho GraphQL API để cải thiện hiệu suất, giảm tải cho backend, và hỗ trợ load balancing.

## Lợi ích của việc sử dụng Nginx với GraphQL

1. **Cải thiện hiệu suất**:
   - Cache GraphQL queries để giảm tải cho backend
   - Gzip/Brotli compression giảm kích thước response
   - HTTP/2 support giảm latency

2. **Load balancing**:
   - Phân phối requests giữa nhiều Rails instances
   - Health checks tự động loại bỏ instances lỗi
   - Sticky sessions để đảm bảo tính nhất quán

3. **Bảo mật và ổn định**:
   - Rate limiting bảo vệ API khỏi DDoS
   - SSL termination giảm tải cho backend
   - Buffer requests và responses

## Cấu trúc dự án

```
├── backend/
│   ├── Dockerfile            # Dockerfile đã tích hợp Nginx
│   ├── entrypoint.sh         # Script khởi động Nginx + Rails
│   └── nginx.conf            # Cấu hình Nginx
└── docker-compose.yml        # Docker Compose đã cấu hình với Nginx
```

## Cách sử dụng trong môi trường development

### Khởi động với Nginx

```bash
docker-compose up
```

Sau khi khởi động, bạn có thể truy cập:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api
- GraphQL API: http://localhost:3001/graphql
- GraphiQL IDE: http://localhost:3001/graphiql

### Kiểm tra cấu hình Nginx

```bash
docker-compose exec backend nginx -t
```

### Xem logs của Nginx

```bash
docker-compose exec backend tail -f /var/log/nginx/error.log
```

## Deploy lên Render

1. Đẩy code lên GitHub
2. Kết nối repository với Render
3. Chọn "Web Service" và chọn Docker làm môi trường
4. Đảm bảo port được cấu hình đúng (80 trong container)

## Cấu hình Nginx

File `backend/nginx.conf` đã được cấu hình để:

1. Cache GraphQL queries (không cache mutations)
2. Xử lý CORS
3. Rate limiting để bảo vệ API
4. Cấu hình cho static files

## Cấu hình cache

Nginx được cấu hình để cache GraphQL queries (GET requests) nhưng không cache mutations (POST requests). Điều này đảm bảo:

1. Introspection queries được cache để tăng tốc GraphiQL IDE
2. Mutations luôn được chuyển trực tiếp đến backend để đảm bảo dữ liệu mới nhất

## Scaling

Để scale ứng dụng:

1. Tạo thêm instances của backend trên Render
2. Cập nhật `upstream rails_app` trong `nginx.conf` để thêm các instances mới
3. Nginx sẽ tự động phân phối traffic giữa các instances

## Monitoring

Bạn có thể monitor hiệu suất của Nginx bằng cách:

1. Sử dụng Render metrics
2. Thêm module `ngx_http_stub_status_module` vào Nginx
3. Kết nối với các công cụ monitoring như Prometheus, Grafana

## Kết luận

Việc sử dụng Nginx với GraphQL API giúp cải thiện đáng kể hiệu suất, khả năng scale, và bảo mật của ứng dụng. Cấu hình đã được tối ưu hóa cho GraphQL, đảm bảo cache đúng queries và không cache mutations.
