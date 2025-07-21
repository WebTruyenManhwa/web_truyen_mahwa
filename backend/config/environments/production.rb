require "active_support/core_ext/integer/time"

Rails.application.configure do
  # Settings specified here will take precedence over those in config/application.rb.

  # Code is not reloaded between requests.
  config.enable_reloading = false

  # Eager load code on boot for better performance and memory savings (ignored by Rake tasks).
  config.eager_load = true

  # Full error reports are disabled.
  config.consider_all_requests_local = false

  # Cache assets for far-future expiry since they are all digest stamped.
  config.public_file_server.headers = { "cache-control" => "public, max-age=#{1.year.to_i}" }

  # Enable serving of images, stylesheets, and JavaScripts from an asset server.
  # config.asset_host = "http://assets.example.com"

  # Store uploaded files on the local file system (see config/storage.yml for options).
  config.active_storage.service = :local

  # Assume all access to the app is happening through a SSL-terminating reverse proxy.
  config.assume_ssl = true

  # Force all access to the app over SSL, use Strict-Transport-Security, and use secure cookies.
  config.force_ssl = true

  # Skip http-to-https redirect for the default health check endpoint.
  # config.ssl_options = { redirect: { exclude: ->(request) { request.path == "/up" } } }

  # Log to STDOUT with the current request id as a default log tag.
  config.log_tags = [ :request_id ]
  config.logger   = ActiveSupport::TaggedLogging.logger(STDOUT)

  # Change to "debug" to log everything (including potentially personally-identifiable information!)
  config.log_level = ENV.fetch("RAILS_LOG_LEVEL", "info")

  # Prevent health checks from clogging up the logs.
  config.silence_healthcheck_path = "/up"

  # Don't log any deprecations.
  config.active_support.report_deprecations = false

  # Sử dụng memory_store với kích thước giới hạn thay vì solid_cache_store
  # Điều này giúp tránh sử dụng quá nhiều RAM và giảm áp lực lên database
  config.cache_store = :memory_store, {
    size: 64.megabytes,
    expires_in: 1.hour,
    race_condition_ttl: 10,
    compress: true
  }

  # Use database for Active Job queue adapter
  config.active_job.queue_adapter = :solid_queue
  config.solid_queue.connects_to = { database: { writing: :queue } }

  # Session store configuration
  config.session_store :cookie_store, key: '_web_truyen_mahwa_session'

  # Bật HTTP caching
  config.action_controller.perform_caching = true

  # Thiết lập thời gian cache mặc định
  config.action_controller.default_url_options = { protocol: 'https' }

  # Thiết lập ETags cho API responses
  config.middleware.use Rack::ETag

  # Ignore bad email addresses and do not raise email delivery errors.
  # Set this to true and configure the email server for immediate delivery to raise delivery errors.
  # config.action_mailer.raise_delivery_errors = false

  # Set host to be used by links generated in mailer templates.
  config.action_mailer.default_url_options = { host: "example.com" }

  # Specify outgoing SMTP server. Remember to add smtp/* credentials via rails credentials:edit.
  # config.action_mailer.smtp_settings = {
  #   user_name: Rails.application.credentials.dig(:smtp, :user_name),
  #   password: Rails.application.credentials.dig(:smtp, :password),
  #   address: "smtp.example.com",
  #   port: 587,
  #   authentication: :plain
  # }

  # Enable locale fallbacks for I18n (makes lookups for any locale fall back to
  # the I18n.default_locale when a translation cannot be found).
  config.i18n.fallbacks = true

  # Do not dump schema after migrations.
  config.active_record.dump_schema_after_migration = false

  # Only use :id for inspections in production.
  config.active_record.attributes_for_inspect = [ :id ]

  # Tắt verbose query logs để giảm kích thước log và tăng hiệu suất
  config.active_record.verbose_query_logs = false

  config.public_file_server.enabled = true

  # Giới hạn số lượng worker processes để giảm sử dụng RAM
  # config.active_job.queue_adapter = :sidekiq

  # Thêm cấu hình tối ưu bộ nhớ cho môi trường ít tài nguyên
  if ENV["LOW_MEMORY_ENV"] == "true" || ENV["RENDER"] == "true"
    # Tối ưu GC cho môi trường ít RAM bằng cách thiết lập các biến môi trường
    ENV['RUBY_GC_MALLOC_LIMIT'] = '8000000'
    ENV['RUBY_GC_MALLOC_LIMIT_MAX'] = '16000000'
    ENV['RUBY_GC_OLDMALLOC_LIMIT'] = '8000000'
    ENV['RUBY_GC_OLDMALLOC_LIMIT_MAX'] = '16000000'
    
    # Chạy GC thường xuyên hơn
    GC::Profiler.enable
    
    # Thực hiện GC ngay lập tức để giải phóng bộ nhớ
    GC.start
    
    # Giảm kích thước của các bộ đệm
    config.action_controller.default_url_options = { protocol: 'https' }
    config.action_mailer.default_url_options = { protocol: 'https' }
    
    # Tắt các tính năng không cần thiết
    config.log_level = :warn
    config.log_tags = [:request_id]
    config.logger = ActiveSupport::Logger.new(STDOUT)
    config.logger.formatter = ::Logger::Formatter.new
    
    # Tối ưu bộ nhớ cache
    config.cache_store = :memory_store, { size: 16.megabytes }
    
    # Nén response để giảm kích thước
    config.middleware.use Rack::Deflater
    
    # Tắt các tính năng debug không cần thiết
    config.active_record.verbose_query_logs = false
    
    # Tối ưu Active Record
    config.active_record.cache_versioning = false
    config.active_record.collection_cache_versioning = false
    
    # # Tối ưu Active Storage (nếu sử dụng)
    # if defined?(ActiveStorage)
    #   config.active_storage.service = :local
    #   config.active_storage.queue = :active_storage
    #   config.active_storage.variant_processor = :mini_magick
    # end
    
    # # Tối ưu Action Cable (nếu sử dụng)
    # if defined?(ActionCable)
    #   config.action_cable.mount_path = nil
    #   config.action_cable.allowed_request_origins = ['https://webtruyen.mahwa.vn']
    # end
  end
end
