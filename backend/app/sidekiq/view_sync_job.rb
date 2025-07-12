class ViewSyncJob
  include Sidekiq::Job

  # Chạy mỗi 12 giờ
  sidekiq_options queue: :default, retry: 3

  def perform
    Rails.logger.info "Starting to sync view counts from Redis to database..."

    begin
      tracker = ViewTrackerService.instance
      tracker.sync_views_to_database
      Rails.logger.info "Successfully synced view counts from Redis to database."
    rescue Redis::CannotConnectError => e
      Rails.logger.error "Error connecting to Redis: #{e.message}"
    rescue => e
      Rails.logger.error "Error syncing view counts: #{e.message}"
    end
  end
end
