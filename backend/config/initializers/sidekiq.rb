# File này đã được vô hiệu hóa vì chúng ta không còn sử dụng Sidekiq nữa
# Nếu cần sử dụng lại trong tương lai, hãy bỏ comment các dòng dưới đây

=begin
require 'sidekiq'
require 'sidekiq-scheduler'

Sidekiq.configure_server do |config|
  config.redis = {
    url: ENV.fetch('REDIS_URL', 'redis://localhost:6379/0'),
    size: 5, # Connection pool size
    network_timeout: 5,
    reconnect_attempts: 3
  }

  # Load scheduler only if there are scheduled jobs
  config.on(:startup) do
    if File.exist?(File.join(Rails.root, 'config', 'sidekiq_schedule.yml'))
      schedule = YAML.load_file(File.join(Rails.root, 'config', 'sidekiq_schedule.yml'))
      if schedule && !schedule.empty?
        Sidekiq.schedule = schedule
        SidekiqScheduler::Scheduler.instance.reload_schedule!
      end
    end
  end
end

Sidekiq.configure_client do |config|
  config.redis = {
    url: ENV.fetch('REDIS_URL', 'redis://localhost:6379/0'),
    size: 3, # Smaller pool for clients
    network_timeout: 5,
    reconnect_attempts: 3
  }
end
=end
