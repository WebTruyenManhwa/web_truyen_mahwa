require 'rufus-scheduler'
require_relative '../../app/services/scheduler_service'

# Khởi tạo scheduler nếu không phải môi trường test và không phải console
if !defined?(Rails::Console) && Rails.env != 'test'
  # Đảm bảo chỉ có một instance của Rails khởi tạo scheduler
  # Sử dụng file lock để tránh duplicate jobs
  lock_file_path = Rails.root.join('tmp', 'scheduler.lock')

  # Tạo thư mục tmp nếu chưa tồn tại
  FileUtils.mkdir_p(Rails.root.join('tmp'))

  begin
    # Thử tạo file lock
    lock_file = File.open(lock_file_path, File::RDWR | File::CREAT | File::EXCL)

    # Ghi process ID vào file lock
    lock_file.write(Process.pid.to_s)
    lock_file.close

    # Đăng ký hook để xóa file lock khi ứng dụng tắt
    at_exit do
      begin
        File.delete(lock_file_path) if File.exist?(lock_file_path)
      rescue => e
        Rails.logger.error "Error deleting scheduler lock file: #{e.message}"
      end
    end

    # Khởi tạo scheduler
    Rails.logger.info "Initializing scheduler in process #{Process.pid}"
    SchedulerService.initialize_scheduler

    # Thêm một job để kiểm tra file lock định kỳ
    scheduler = Rufus::Scheduler.singleton
    scheduler.every '1m' do
      begin
        # Kiểm tra xem file lock có tồn tại không
        unless File.exist?(lock_file_path)
          # Nếu file lock không tồn tại, tạo lại
          lock_file = File.open(lock_file_path, File::RDWR | File::CREAT | File::EXCL)
          lock_file.write(Process.pid.to_s)
          lock_file.close
          Rails.logger.info "Recreated scheduler lock file"
        end

        # Kiểm tra xem process ID trong file lock có phải là process hiện tại không
        lock_pid = File.read(lock_file_path).to_i
        if lock_pid != Process.pid
          # Nếu không phải, dừng scheduler
          Rails.logger.info "Stopping scheduler in process #{Process.pid} (lock owned by process #{lock_pid})"
          scheduler.shutdown
        end
      rescue Errno::EEXIST
        # File đã tồn tại, do nothing
      rescue => e
        Rails.logger.error "Error checking scheduler lock file: #{e.message}"
      end
    end
  rescue Errno::EEXIST
    # File lock đã tồn tại, một instance khác đã khởi tạo scheduler
    Rails.logger.info "Scheduler already initialized in another process"
  rescue => e
    Rails.logger.error "Error initializing scheduler: #{e.message}"
  end
end
