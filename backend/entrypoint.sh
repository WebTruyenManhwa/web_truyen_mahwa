#!/usr/bin/env bash
set -e

# Đảm bảo thư mục log tồn tại
mkdir -p /rails/log

# Đặt biến môi trường để ghi log chi tiết
export RAILS_LOG_TO_STDOUT=true

rm -f /rails/tmp/pids/server.pid

# Chờ database sẵn sàng
until bundle exec rails runner "ActiveRecord::Base.connection"; do
  echo "⏳ Waiting for DB..."
  sleep 2
done

# Chờ Redis sẵn sàng
until bundle exec rails runner "Redis.new(url: ENV.fetch('REDIS_URL', 'redis://localhost:6379/0')).ping"; do
  echo "⏳ Waiting for Redis..."
  sleep 2
done

# Chạy migration
echo "🏃 Running migrations..."
bundle exec rails db:migrate

echo "🚀 Starting application..."
# Chạy lệnh được truyền vào
exec "$@"
