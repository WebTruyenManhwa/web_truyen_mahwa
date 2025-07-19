class RunScheduledCrawlsJob < ApplicationJob
  queue_as :crawlers

  def perform
    Rails.logger.info "Running scheduled crawls at #{Time.current}"

    # Tìm tất cả các lịch crawl đã đến hạn
    scheduled_crawls = ScheduledCrawl.due_for_run

    results = {
      timestamp: Time.current,
      total_scheduled_crawls: scheduled_crawls.count,
      executed_crawls: [],
      errors: []
    }

    if scheduled_crawls.empty?
      Rails.logger.info "No scheduled crawls due for execution"
      return results
    end

    # Chạy từng lịch crawl
    scheduled_crawls.each do |scheduled_crawl|
      begin
        Rails.logger.info "Executing scheduled crawl ##{scheduled_crawl.id} for manga '#{scheduled_crawl.manga_title}'"
        scheduled_crawl.execute

        # Thêm vào kết quả
        results[:executed_crawls] << {
          id: scheduled_crawl.id,
          manga_id: scheduled_crawl.manga_id,
          manga_title: scheduled_crawl.manga_title,
          url: scheduled_crawl.url,
          next_run_at: scheduled_crawl.next_run_at
        }
      rescue => e
        Rails.logger.error "Error executing scheduled crawl ##{scheduled_crawl.id}: #{e.message}"
        Rails.logger.error e.backtrace.join("\n")

        # Thêm lỗi vào kết quả
        results[:errors] << {
          id: scheduled_crawl.id,
          manga_id: scheduled_crawl.manga_id,
          manga_title: scheduled_crawl.manga_title,
          error: e.message
        }
      end
    end

    Rails.logger.info "Finished running #{scheduled_crawls.count} scheduled crawls"
    results
  end
end
