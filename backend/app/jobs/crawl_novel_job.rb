class CrawlNovelJob < ApplicationJob
  queue_as :crawlers

  # Thời gian tối đa cho một job (3 giờ)
  MAX_EXECUTION_TIME = 3.hours

  # Thực hiện crawl novel
  def perform(url, options = {})
    # Đảm bảo options là hash với symbol keys
    options = options.deep_symbolize_keys if options.respond_to?(:deep_symbolize_keys)

    # Kiểm tra xem job có job_id không
    if options[:job_id].present?
      # Cập nhật trạng thái job
      job = ScheduledJob.find_by(id: options[:job_id])
      if job
        job.update(status: 'running', started_at: Time.current)
      end
    end

    # Set thời gian bắt đầu
    start_time = Time.current

    # Log thông tin job
    Rails.logger.info "Starting novel crawl job for URL: #{url}"
    Rails.logger.info "Options: #{options.inspect}"

    # Thực hiện crawl
    result = NovelCrawlerService.crawl_novel(url, options)

    # Kiểm tra kết quả
    if result[:status] == 'success'
      # Cập nhật job nếu có
      if options[:job_id].present? && job
        # Tạo summary result để tránh lưu dữ liệu lớn
        summary_result = {
          status: result[:status],
          novel: result[:novel],
          chapters_count: result[:chapters].size,
          successful_chapters: result[:chapters].count { |c| c[:status] == 'success' },
          failed_chapters: result[:chapters].count { |c| c[:status] == 'error' },
          skipped_chapters: result[:chapters].count { |c| c[:status] == 'skipped' }
        }

        job.update(
          status: 'completed',
          completed_at: Time.current,
          summary_result: summary_result,
          memory_optimized: true
        )
      end

      # Log thành công
      Rails.logger.info "Novel crawl job completed successfully for URL: #{url}"
      Rails.logger.info "Crawled #{result[:novel][:crawled_chapters]} chapters for novel '#{result[:novel][:title]}'"
    else
      # Cập nhật job nếu có
      if options[:job_id].present? && job
        # Tạo error summary
        error_summary = {
          status: result[:status],
          message: result[:message]
        }

        job.update(
          status: 'failed',
          completed_at: Time.current,
          error_message: result[:message],
          summary_result: error_summary,
          memory_optimized: true
        )
      end

      # Log thất bại
      Rails.logger.error "Novel crawl job failed for URL: #{url}"
      Rails.logger.error "Error: #{result[:message]}"
    end

    # Kiểm tra thời gian thực thi
    if Time.current - start_time > MAX_EXECUTION_TIME
      Rails.logger.warn "Novel crawl job exceeded maximum execution time of #{MAX_EXECUTION_TIME} seconds"
    end

    # Trả về kết quả
    result
  end

  # Kiểm tra thời gian thực thi để tránh job chạy quá lâu
  def check_execution_time(start_time)
    if Time.current - start_time > MAX_EXECUTION_TIME
      Rails.logger.warn "Novel crawl job exceeded maximum execution time of #{MAX_EXECUTION_TIME} seconds"
      return false
    end
    true
  end
end
