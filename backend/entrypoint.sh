#!/usr/bin/env bash
set -e

# Xóa PID cũ
rm -f /rails/tmp/pids/server.pid

# Chờ DB sẵn sàng
until bundle exec rails runner "ActiveRecord::Base.connection"; do
  echo "⏳ Waiting for DB..."
  sleep 2
done

echo "🏃 Running migrations..."
bundle exec rails db:migrate

exec "$@"