class SchedulerService
  # Singleton instance
  class << self
    # Khởi tạo scheduler
    def initialize_scheduler
      return if @scheduler

      @scheduler = Rufus::Scheduler.new
      @scheduler.every '5m', first_in: '1s', overlap: false, name: 'scheduled_crawl_check' do
        schedule_crawl_check
      end

      # Thêm một job để kiểm tra các job đã lên lịch trong database
      @scheduler.every '1m', first_in: '10s', overlap: false, name: 'process_database_jobs' do
        process_database_jobs
      end

      # Thêm một job để dọn dẹp các job cũ
      @scheduler.every '1h', first_in: '30s', overlap: false, name: 'cleanup_old_jobs' do
        cleanup_old_jobs
      end

      # Thêm một job để kiểm tra và giải phóng các lock bị treo
      @scheduler.every '5m', first_in: '20s', overlap: false, name: 'release_stale_locks' do
        release_stale_locks
      end

      # Log thông tin khởi tạo
      Rails.logger.info "Scheduler initialized with #{@scheduler.jobs.size} jobs"
    end

    # Lên lịch kiểm tra các scheduled crawls
    def schedule_crawl_check
      # Tạo một job trong database để theo dõi
      job = ScheduledJob.find_or_create_for_schedule(
        'scheduled_crawl_check',
        Time.current.beginning_of_minute
      )

      # Kiểm tra xem job này đã được xử lý chưa
      return if job.status != 'pending'

      # Đánh dấu job đang chạy
      job.mark_as_running

      begin
        # Chạy job kiểm tra các scheduled crawls
        result = RunScheduledCrawlsJob.perform_now(job.options || {})

        # Đánh dấu job đã hoàn thành
        job.mark_as_completed(result.to_json)
      rescue => e
        # Log lỗi
        Rails.logger.error "Error running scheduled crawl check: #{e.message}"
        Rails.logger.error e.backtrace.join("\n")

        # Đánh dấu job thất bại
        job.mark_as_failed(e.message)
      end
    end

    # Xử lý các job đã lên lịch trong database
    def process_database_jobs
      # Tìm tất cả các job đến hạn và chưa được xử lý
      ScheduledJob.pending_and_due.find_each do |job|
        # Kiểm tra xem job này đã được xử lý chưa
        next if job.locked?

        # Đánh dấu job đang chạy
        job.mark_as_running

        # Xử lý job theo loại
        begin
          case job.job_type
          when 'scheduled_crawl_check'
            result = RunScheduledCrawlsJob.perform_now(job.options || {})
            job.mark_as_completed(result.to_json)
          when 'single_job'
            # Xử lý single job với các tham số từ options
            options = job.options
            if options[:job_class] && options[:job_args]
              job_class = options[:job_class].constantize
              job_args = options[:job_args]

              result = job_class.perform_now(*job_args)
              job.mark_as_completed(result.to_json)
            else
              job.mark_as_failed('Missing job_class or job_args in options')
            end
          else
            job.mark_as_failed("Unknown job type: #{job.job_type}")
          end
        rescue => e
          # Log lỗi
          Rails.logger.error "Error processing job ##{job.id} (#{job.job_type}): #{e.message}"
          Rails.logger.error e.backtrace.join("\n")

          # Đánh dấu job thất bại
          job.mark_as_failed(e.message)
        end
      end
    end

    # Dọn dẹp các job cũ
    def cleanup_old_jobs
      # Xóa các job đã hoàn thành và cũ hơn 7 ngày
      ScheduledJob.where(status: 'completed')
                 .where('completed_at < ?', 7.days.ago)
                 .delete_all

      # Xóa các job đã thất bại và cũ hơn 30 ngày
      ScheduledJob.where(status: 'failed')
                 .where('completed_at < ?', 30.days.ago)
                 .delete_all
    end

    # Giải phóng các lock bị treo
    def release_stale_locks
      # Tìm tất cả các job đang chạy và có lock đã hết hạn
      ScheduledJob.running.find_each do |job|
        if job.lock_expired?
          # Đánh dấu job thất bại
          job.mark_as_failed('Lock expired')
        end
      end
    end

    # Lên lịch cho một job cụ thể
    def schedule_job(job_class, job_args = [], run_at = Time.current)
      # Tạo một job trong database
      ScheduledJob.create(
        job_type: 'single_job',
        status: 'pending',
        scheduled_at: run_at,
        options: {
          job_class: job_class.to_s,
          job_args: job_args
        }
      )
    end
  end
end
