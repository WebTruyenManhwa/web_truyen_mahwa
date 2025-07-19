class RunScheduledCrawlsJob < ApplicationJob
  queue_as :crawlers

  def perform(options = {})
    Rails.logger.info "Running scheduled crawls at #{Time.current}"

    # Kiểm tra xem có scheduled_crawl_id cụ thể trong options không
    if options && options[:scheduled_crawl_id].present?
      scheduled_crawl_id = options[:scheduled_crawl_id]
      scheduled_crawl = ScheduledCrawl.find_by(id: scheduled_crawl_id)

      if scheduled_crawl
        Rails.logger.info "Running specific scheduled crawl ##{scheduled_crawl_id}"
        results = {
          timestamp: Time.current,
          total_scheduled_crawls: 1,
          executed_crawls: [],
          errors: []
        }

        begin
          Rails.logger.info "Executing scheduled crawl ##{scheduled_crawl.id} for manga '#{scheduled_crawl.manga_title}'"
          scheduled_crawl.execute

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

          results[:errors] << {
            id: scheduled_crawl.id,
            manga_id: scheduled_crawl.manga_id,
            manga_title: scheduled_crawl.manga_title,
            error: e.message
          }
        end

        return results
      else
        Rails.logger.error "Scheduled crawl ##{scheduled_crawl_id} not found"
        return {
          timestamp: Time.current,
          error: "Scheduled crawl ##{scheduled_crawl_id} not found"
        }
      end
    end

    # Tiếp tục xử lý tất cả các scheduled crawls đến hạn như thông thường
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
