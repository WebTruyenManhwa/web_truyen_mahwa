class CrawlMangaJob < ApplicationJob
  queue_as :crawlers

  # Số lần thử lại tối đa khi job thất bại
  retry_on StandardError, wait: :exponentially_longer, attempts: 3

  # Thời gian tối đa cho job (2 giờ)
  # Nếu job chạy quá lâu, nó sẽ bị hủy
  # Điều này giúp tránh trường hợp job bị treo
  # và chiếm tài nguyên server
  # Sidekiq Pro/Enterprise feature
  # sidekiq_options timeout: 7200

  def perform(url, options = {})
    Rails.logger.info "Starting to crawl manga from URL: #{url}"

    # Log options
    Rails.logger.info "Options: #{options.inspect}"

    # Crawl manga
    result = MangaCrawlerService.crawl_manga(url, options)

    # Log kết quả
    if result[:status] == 'success'
      Rails.logger.info "Successfully crawled manga: #{result[:manga][:title]}"
      Rails.logger.info "Total chapters: #{result[:manga][:total_chapters]}"
      Rails.logger.info "Crawled chapters: #{result[:manga][:crawled_chapters]}"

      # Tạo thông báo cho admin
      create_notification(result)
    else
      Rails.logger.error "Failed to crawl manga: #{result[:message]}"

      # Tạo thông báo lỗi cho admin
      create_error_notification(url, result[:message])
    end

    # Trả về kết quả để có thể kiểm tra sau này
    result
  end

  private

  # Tạo thông báo khi crawl thành công
  def create_notification(result)
    # Sử dụng NotificationService để gửi thông báo cho admin
    NotificationService.notify_admins(
      title: "Manga Crawl Hoàn thành",
      content: "Đã crawl thành công truyện '#{result[:manga][:title]}'. " \
              "Tổng: #{result[:manga][:total_chapters]} chapter, " \
              "Đã crawl: #{result[:manga][:crawled_chapters]} chapter.",
      notification_type: Notification::TYPES[:manga_crawl],
      reference_id: result[:manga][:id],
      reference_type: 'Manga'
    )
  end

  # Tạo thông báo khi crawl thất bại
  def create_error_notification(url, error_message)
    # Sử dụng NotificationService để gửi thông báo cho admin
    NotificationService.notify_admins(
      title: "Manga Crawl Thất bại",
      content: "Không thể crawl truyện từ URL: #{url}. Lỗi: #{error_message}",
      notification_type: Notification::TYPES[:manga_crawl_error],
      reference_type: 'Error'
    )
  end
end
