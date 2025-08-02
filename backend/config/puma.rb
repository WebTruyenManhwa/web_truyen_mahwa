# This configuration file will be evaluated by Puma. The top-level methods that
# are invoked here are part of Puma's configuration DSL. For more information
# about methods provided by the DSL, see https://puma.io/puma/Puma/DSL.html.
#
# Puma starts a configurable number of processes (workers) and each process
# serves each request in a thread from an internal thread pool.
#
# For environments with limited memory (512MB or less), we should use fewer workers
# and threads to avoid memory issues.
#
# The ideal number of threads per worker depends both on how much time the
# application spends waiting for IO operations and on how much you wish to
# prioritize throughput over latency.

# Giảm số lượng workers và threads cho môi trường ít RAM
if ENV["LOW_MEMORY_ENV"] == "true" || ENV["RENDER"] == "true"
  # Cho môi trường ít RAM như Render (512MB), chỉ dùng 1 worker và ít threads
  workers ENV.fetch("WEB_CONCURRENCY", 1)
  threads_count = ENV.fetch("RAILS_MAX_THREADS", 2)
else
  # Cho môi trường có nhiều RAM hơn
  workers ENV.fetch("WEB_CONCURRENCY", 2)
  threads_count = ENV.fetch("RAILS_MAX_THREADS", 3)
end

threads threads_count, threads_count

# Specifies the `port` that Puma will listen on to receive requests; default is 3000.
port ENV.fetch("PORT", 3000)

# Allow puma to be restarted by `bin/rails restart` command.
plugin :tmp_restart

# Run the Solid Queue supervisor inside of Puma for single-server deployments
plugin :solid_queue if ENV["SOLID_QUEUE_IN_PUMA"]

# Specify the PID file. Defaults to tmp/pids/server.pid in development.
# In other environments, only set the PID file if requested.
pidfile ENV["PIDFILE"] if ENV["PIDFILE"]

# Thêm timeout cho worker shutdown để tránh mất kết nối đột ngột
worker_shutdown_timeout 30

# Giảm thời gian boot để tiết kiệm bộ nhớ trong quá trình khởi động
worker_boot_timeout 30

# Thêm phục hồi khi worker bị crash
worker_timeout 60

# Kích hoạt chế độ phục hồi sau lỗi
restart_command ['--restart', 'on-failure', '--']

# Thêm log khi nhận tín hiệu TERM
trap 'TERM' do
  STDOUT.puts "[#{Time.now}] Puma master #{Process.pid} received SIGTERM"
  # Thêm log để debug memory usage
  begin
    mem_info = `ps -o rss= -p #{Process.pid}`.to_i / 1024
    STDOUT.puts "[#{Time.now}] Memory usage at shutdown: #{mem_info}MB"
  rescue => e
    STDOUT.puts "[#{Time.now}] Error getting memory info: #{e.message}"
  end
end

# Thêm log khi worker shutdown để theo dõi nguyên nhân
on_worker_shutdown do |index|
  Rails.logger.info "Puma worker #{index} shutting down at #{Time.now}, reason: #{$!.inspect if $!}"
  # Thêm log để debug memory usage
  begin
    mem_info = `ps -o rss= -p #{Process.pid}`.to_i / 1024
    Rails.logger.info "Memory usage of worker #{index} at shutdown: #{mem_info}MB"
  rescue => e
    Rails.logger.info "Error getting memory info for worker #{index}: #{e.message}"
  end
end

# Thêm hook để chạy GC trước khi worker bắt đầu xử lý request
before_fork do
  GC.compact if defined?(GC.compact)
end

# Thêm hook để chạy GC sau mỗi request để giảm memory footprint
on_worker_boot do
  GC.start
end