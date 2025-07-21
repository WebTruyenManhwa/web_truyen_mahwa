class SchedulerService
  # Singleton instance
  class << self
    # Khởi tạo scheduler
    def initialize_scheduler
      if @scheduler
        Rails.logger.info "⚠️ Scheduler đã được khởi tạo trước đó, bỏ qua"
        return @scheduler
      end

      Rails.logger.info "🚀 Khởi tạo Rufus Scheduler mới"
      @scheduler = Rufus::Scheduler.new

      # Đảm bảo có kết nối database trước khi đăng ký các jobs
      Rails.logger.info "📊 Kiểm tra kết nối database trước khi đăng ký jobs"
      begin
        # Thử kết nối với database
        ActiveRecord::Base.connection_pool.with_connection do |conn|
          conn.execute("SELECT 1")
          Rails.logger.info "✅ Kết nối database thành công"
        end
      rescue => e
        Rails.logger.error "❌ Lỗi khi kiểm tra kết nối database: #{e.message}"
        Rails.logger.info "⏱️ Đăng ký job kiểm tra kết nối database sau 5 giây"
        
        # Đăng ký một job để thử lại sau 5 giây
        @scheduler.in '5s' do
          Rails.logger.info "🔄 Thử lại khởi tạo scheduler..."
          initialize_scheduler
        end
        
        return @scheduler
      end

      Rails.logger.info "📅 Đăng ký job kiểm tra scheduled crawls mỗi 5 phút"
      @scheduler.every '5m', first_in: '1s', overlap: false, name: 'scheduled_crawl_check' do
        # Bọc trong khối begin/rescue để xử lý lỗi kết nối
        begin
          schedule_crawl_check
        rescue => e
          Rails.logger.error "❌ Lỗi khi chạy scheduled_crawl_check: #{e.message}"
          Rails.logger.error e.backtrace.join("\n")
        end
      end

      # Thêm một job để kiểm tra các job đã lên lịch trong database
      Rails.logger.info "📅 Đăng ký job xử lý database jobs mỗi 1 phút"
      @scheduler.every '1m', first_in: '10s', overlap: false, name: 'process_database_jobs' do
        # Bọc trong khối begin/rescue để xử lý lỗi kết nối
        begin
          process_database_jobs
        rescue => e
          Rails.logger.error "❌ Lỗi khi chạy process_database_jobs: #{e.message}"
          Rails.logger.error e.backtrace.join("\n")
        end
      end

      # Thêm một job để dọn dẹp các job cũ
      Rails.logger.info "📅 Đăng ký job dọn dẹp old jobs mỗi 6 giờ"
      @scheduler.every '6h', first_in: '30s', overlap: false, name: 'cleanup_old_jobs' do
        # Bọc trong khối begin/rescue để xử lý lỗi kết nối
        begin
          cleanup_old_jobs
        rescue => e
          Rails.logger.error "❌ Lỗi khi chạy cleanup_old_jobs: #{e.message}"
          Rails.logger.error e.backtrace.join("\n")
        end
      end

      # Thêm một job để kiểm tra và giải phóng các lock bị treo
      Rails.logger.info "📅 Đăng ký job giải phóng stale locks mỗi 5 phút"
      @scheduler.every '5m', first_in: '20s', overlap: false, name: 'release_stale_locks' do
        # Bọc trong khối begin/rescue để xử lý lỗi kết nối
        begin
          release_stale_locks
        rescue => e
          Rails.logger.error "❌ Lỗi khi chạy release_stale_locks: #{e.message}"
          Rails.logger.error e.backtrace.join("\n")
        end
      end

      # Thêm một job để dọn dẹp các job thừa nếu có quá nhiều job trong ngày
      Rails.logger.info "📅 Đăng ký job dọn dẹp excess jobs mỗi 3 giờ"
      @scheduler.every '3h', first_in: '2m', overlap: false, name: 'cleanup_excess_jobs' do
        # Bọc trong khối begin/rescue để xử lý lỗi kết nối
        begin
          cleanup_excess_jobs
        rescue => e
          Rails.logger.error "❌ Lỗi khi chạy cleanup_excess_jobs: #{e.message}"
          Rails.logger.error e.backtrace.join("\n")
        end
      end

      # Log thông tin khởi tạo
      Rails.logger.info "✅ Scheduler đã được khởi tạo với #{@scheduler.jobs.size} jobs"

      # Log danh sách các jobs
      @scheduler.jobs.each do |job|
        Rails.logger.info "  • Job #{job.id}: #{job.name || 'unnamed'} (#{job.original})"
      end

      # Log thông tin về múi giờ
      Rails.logger.info "⏰ Timezone configuration:"
      Rails.logger.info "⏰ Rails.application.config.time_zone: #{Rails.application.config.time_zone}"
      Rails.logger.info "⏰ Time.zone.name: #{Time.zone.name}"
      Rails.logger.info "⏰ ENV['TZ']: #{ENV['TZ']}"
      Rails.logger.info "⏰ Time.now: #{Time.now}"
      Rails.logger.info "⏰ Time.current: #{Time.current}"

      return @scheduler
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
      ensure
        # Đảm bảo connection được trả về pool (Rails 8.0.2+)
        ActiveRecord::Base.connection_pool.release_connection
      end
    end

    # Xử lý các job đã lên lịch trong database
    def process_database_jobs
      # Log bắt đầu
      Rails.logger.info "🔍 Checking for pending jobs at #{Time.current}"

      begin
        # Tìm tất cả các job đến hạn và chưa được xử lý
        pending_jobs = ScheduledJob.pending_and_due
        
        # Kiểm tra và log chi tiết về các job đang chờ xử lý
        if pending_jobs.exists?
          Rails.logger.info "📋 Found #{pending_jobs.count} pending jobs to process"
          pending_jobs.each do |job|
            Rails.logger.info "  • Job ##{job.id}: scheduled_at=#{job.scheduled_at} (UTC: #{job.scheduled_at.utc}), current time=#{Time.current} (UTC: #{Time.current.utc})"
          end
        end

        pending_jobs.find_each do |job|
          # Kiểm tra xem job này đã được xử lý chưa
          next if job.locked?

          # Log job đang xử lý
          Rails.logger.info "🔄 Processing job ##{job.id} (#{job.job_type}) scheduled at #{job.scheduled_at}"

          # Đánh dấu job đang chạy
          job.mark_as_running

          # Xử lý job theo loại
          begin
            case job.job_type
            when 'scheduled_crawl_check'
              result = RunScheduledCrawlsJob.perform_now(job.options || {})
              job.mark_as_completed(result.to_json)
              Rails.logger.info "✅ Completed job ##{job.id} (scheduled_crawl_check)"
            when 'single_job'
              # Xử lý single job với các tham số từ options
              options = job.options || {}
              if options[:job_class].present? && options[:job_args].present?
                job_class = options[:job_class].constantize
                job_args = options[:job_args]

                Rails.logger.info "🚀 Running #{job_class} with args: #{job_args.inspect}"
                result = job_class.perform_now(*job_args)
                job.mark_as_completed(result.to_json)
                Rails.logger.info "✅ Completed job ##{job.id} (#{job_class})"
              else
                job.mark_as_failed('Missing job_class or job_args in options')
                Rails.logger.error "❌ Failed job ##{job.id}: Missing job_class or job_args"
              end
            else
              job.mark_as_failed("Unknown job type: #{job.job_type}")
              Rails.logger.error "❌ Failed job ##{job.id}: Unknown job type: #{job.job_type}"
            end
          rescue => e
            # Log lỗi
            Rails.logger.error "❌ Error processing job ##{job.id} (#{job.job_type}): #{e.message}"
            Rails.logger.error e.backtrace.join("\n")

            # Đánh dấu job thất bại
            job.mark_as_failed(e.message)
          end
        end
      rescue => e
        # Log lỗi
        Rails.logger.error "❌ Error in process_database_jobs: #{e.message}"
        Rails.logger.error e.backtrace.join("\n")
      ensure
        # Đảm bảo connection được trả về pool (Rails 8.0.2+)
        ActiveRecord::Base.connection_pool.release_connection
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

    # Dọn dẹp các job thừa nếu có quá nhiều job trong ngày
    def cleanup_excess_jobs
      # Số lượng job tối đa cho phép trong một ngày
      max_jobs_per_day = 100

      # Lấy ngày hiện tại
      today = Time.current.beginning_of_day

      # Đếm số lượng job đã tạo trong ngày hôm nay
      job_count = ScheduledJob.where('created_at >= ?', today).count

      # Nếu số lượng job vượt quá giới hạn
      if job_count > max_jobs_per_day
        Rails.logger.warn "⚠️ Phát hiện #{job_count} jobs trong ngày hôm nay, vượt quá giới hạn #{max_jobs_per_day}. Tiến hành dọn dẹp..."

        # Xóa các job đã hoàn thành trong ngày hôm nay
        completed_count = ScheduledJob.where(status: 'completed')
                                    .where('created_at >= ?', today)
                                    .delete_all

        # Xóa các job đã thất bại trong ngày hôm nay
        failed_count = ScheduledJob.where(status: 'failed')
                                 .where('created_at >= ?', today)
                                 .delete_all

        # Log kết quả
        Rails.logger.info "🧹 Đã xóa #{completed_count} jobs hoàn thành và #{failed_count} jobs thất bại trong ngày hôm nay"
      end
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
      # Đảm bảo run_at là Time object trong múi giờ hiện tại
      run_at = run_at.in_time_zone(Time.zone) if run_at.respond_to?(:in_time_zone)
      
      # Log thời gian lên lịch để debug
      Rails.logger.info "Scheduling job #{job_class} to run at #{run_at} (UTC: #{run_at.utc}) (Zone: #{Time.zone.name})"

      # Tạo một job trong database
      job = ScheduledJob.create(
        job_type: 'single_job',
        status: 'pending',
        scheduled_at: run_at,
        options: {
          job_class: job_class.to_s,
          job_args: job_args
        }
      )

      # Nếu job_args[1] là một hash (options), thêm job_id vào đó
      if job_args.size > 1 && job_args[1].is_a?(Hash)
        # Cập nhật options trong database
        job_args[1][:job_id] = job.id
        job.update(options: {
          job_class: job_class.to_s,
          job_args: job_args
        })
      end

      job
    end
  end
end
