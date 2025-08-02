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

# Puma can serve each request in a thread from an internal thread pool.
# The `threads` method setting takes two numbers: a minimum and maximum.
# Any libraries that use thread pools should be configured to match
# the maximum value specified for Puma. Default is set to 5 threads for minimum
# and maximum; this matches the default thread size of Active Record.
#
max_threads_count = ENV.fetch("RAILS_MAX_THREADS") { 5 }
min_threads_count = ENV.fetch("RAILS_MIN_THREADS") { max_threads_count }
threads min_threads_count, max_threads_count

# Specifies the `worker_timeout` threshold that Puma will use to wait before
# terminating a worker in development environments.
#
worker_timeout 3600 if ENV.fetch("RAILS_ENV", "development") == "development"

# Specifies the `port` that Puma will listen on to receive requests; default is 3000.
#
port ENV.fetch("PORT") { 3000 }

# Specifies the `environment` that Puma will run in.
#
environment ENV.fetch("RAILS_ENV") { "development" }

# Specifies the `pidfile` that Puma will use.
pidfile ENV.fetch("PIDFILE") { "tmp/pids/server.pid" }

# Specifies the number of `workers` to boot in clustered mode.
# Workers are forked web server processes. If using threads and workers together
# the concurrency of the application would be max `threads` * `workers`.
# Workers do not work on JRuby or Windows (both of which do not support
# processes).
#
workers ENV.fetch("WEB_CONCURRENCY") { 2 }

# Use the `preload_app!` method when specifying a `workers` number.
# This directive tells Puma to first boot the application and load code
# before forking the application. This takes advantage of Copy On Write
# process behavior so workers use less memory.
#
preload_app!

# Allow puma to be restarted by `bin/rails restart` command.
plugin :tmp_restart

# Tối ưu cho môi trường ít tài nguyên
if ENV["RAILS_ENV"] == "production" || ENV["LOW_MEMORY_ENV"] == "true"
  # Giảm số lượng worker và thread khi ít tài nguyên
  if ENV["RENDER"] == "true"
    workers ENV.fetch("WEB_CONCURRENCY") { 1 }
    threads ENV.fetch("RAILS_MIN_THREADS") { 1 }, ENV.fetch("RAILS_MAX_THREADS") { 5 }
  end

  # Giảm memory footprint
  before_fork do
    GC.compact if defined?(GC) && GC.respond_to?(:compact)
  end

  # Cấu hình timeout để tránh worker treo
  worker_timeout ENV.fetch("WORKER_TIMEOUT") { 60 }
  worker_shutdown_timeout ENV.fetch("WORKER_SHUTDOWN_TIMEOUT") { 30 }

  # Tắt request logging trong Puma (đã có trong Rails)
  quiet
end

# Run the Solid Queue supervisor inside of Puma for single-server deployments
plugin :solid_queue if ENV["SOLID_QUEUE_IN_PUMA"]

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
