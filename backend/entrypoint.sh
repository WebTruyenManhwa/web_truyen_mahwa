#!/usr/bin/env bash
set -e

# Set timezone explicitly
echo "Setting timezone to Asia/Ho_Chi_Minh"
export TZ=Asia/Ho_Chi_Minh

# Đặt biến môi trường để ghi log chi tiết
export RAILS_LOG_TO_STDOUT=true

rm -f /rails/tmp/pids/server.pid

# Chờ database sẵn sàng
until bundle exec rails runner "ActiveRecord::Base.connection"; do
  echo "⏳ Waiting for DB..."
  sleep 2
done

# Chạy migration
echo "🏃 Running migrations..."
bundle exec rails db:migrate

# Đảm bảo thư mục cache của Nginx tồn tại và có quyền ghi
echo "🔧 Setting up Nginx cache..."
mkdir -p /var/cache/nginx/graphql
chown -R www-data:www-data /var/cache/nginx

# Kiểm tra xem nginx đã được cài đặt chưa
if command -v nginx >/dev/null 2>&1; then
  # Kiểm tra cấu hình Nginx
  echo "🔍 Checking Nginx configuration..."
  nginx -t || true

  # Khởi động Nginx (không chạy ở foreground để không block entrypoint)
  echo "🚀 Starting Nginx..."
  service nginx start || nginx || echo "⚠️ Không thể khởi động Nginx, tiếp tục với Rails"
else
  echo "⚠️ Nginx không được tìm thấy, tiếp tục với Rails"
fi

echo "🚀 Starting application..."
# Chạy lệnh được truyền vào
exec "$@"
