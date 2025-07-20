require 'rufus-scheduler'
require_relative '../../app/services/scheduler_service'

# Khởi tạo scheduler nếu không phải môi trường test và không phải console
if !defined?(Rails::Console) && Rails.env != 'test'
  # Tự động xóa scheduler locks khi khởi động server
  begin
    if ActiveRecord::Base.connection.table_exists?('scheduler_locks')
      count = ActiveRecord::Base.connection.execute("DELETE FROM scheduler_locks").cmd_tuples
      Rails.logger.info "✅ Tự động xóa #{count} scheduler locks khi khởi động server"
    end
  rescue => e
    Rails.logger.error "❌ Lỗi khi xóa scheduler locks: #{e.message}"
  end

  # Cấu hình connection pool
  begin
    # Tăng timeout cho connection pool
    ActiveRecord::Base.connection_pool.instance_variable_set(:@timeout, 10)

    # Tăng kích thước pool nếu cần
    current_pool_size = ActiveRecord::Base.connection_pool.size
    if current_pool_size < 10
      Rails.logger.info "⚠️ Connection pool size hiện tại (#{current_pool_size}) có thể quá nhỏ cho scheduler"
    end

    Rails.logger.info "🔄 Connection pool: size=#{ActiveRecord::Base.connection_pool.size}, timeout=#{ActiveRecord::Base.connection_pool.instance_variable_get(:@timeout)}s"
  rescue => e
    Rails.logger.error "❌ Lỗi khi cấu hình connection pool: #{e.message}"
  end

  # Log để kiểm tra scheduler khởi động
  Rails.logger.info "🔄 Attempting to initialize scheduler in process #{Process.pid}"

  # Đảm bảo chỉ có một instance của Rails khởi tạo scheduler
  # Sử dụng database lock thay vì file lock
  begin
    # Tạo bản ghi scheduler_lock nếu chưa tồn tại
    unless ActiveRecord::Base.connection.table_exists?('scheduler_locks')
      Rails.logger.info "📊 Creating scheduler_locks table"
      ActiveRecord::Base.connection.create_table(:scheduler_locks) do |t|
        t.string :name, null: false
        t.integer :process_id, null: false
        t.datetime :locked_at, null: false
        t.datetime :heartbeat_at
        t.index :name, unique: true
      end
    end

    # Kiểm tra và xóa lock cũ nếu process không còn tồn tại
    begin
      lock_record = ActiveRecord::Base.connection.execute(
        "SELECT process_id, locked_at FROM scheduler_locks WHERE name = 'main_scheduler'"
      ).first

      if lock_record
        old_pid = lock_record['process_id']
        locked_at = lock_record['locked_at']

        # Kiểm tra xem process cũ có còn hoạt động không
        process_exists = begin
                           Process.kill(0, old_pid)
                           true
                         rescue Errno::ESRCH
                           false
                         rescue
                           true
                         end

        # Kiểm tra thời gian lock, nếu quá 5 phút mà không có heartbeat thì coi như stale
        lock_stale = Time.current - locked_at > 5.minutes

        if !process_exists || lock_stale
          Rails.logger.info "🧹 Removing stale scheduler lock from process #{old_pid} (exists: #{process_exists}, stale: #{lock_stale})"
          ActiveRecord::Base.connection.execute(
            "DELETE FROM scheduler_locks WHERE name = 'main_scheduler' AND process_id = #{old_pid}"
          )
        end
      end
    rescue => e
      Rails.logger.error "Error checking stale locks: #{e.message}"
    end

    # Thử lấy khóa bằng cách insert một bản ghi mới
    # Nếu đã tồn tại, sẽ gây ra lỗi unique constraint
    ActiveRecord::Base.connection.execute(
      "INSERT INTO scheduler_locks (name, process_id, locked_at) VALUES ('main_scheduler', #{Process.pid}, NOW())"
    )

    # Nếu đến đây thì đã lấy được khóa
    Rails.logger.info "🔒 Acquired scheduler lock for process #{Process.pid}"

    # Đăng ký hook để xóa khóa khi ứng dụng tắt
    at_exit do
      begin
        ActiveRecord::Base.connection.execute(
          "DELETE FROM scheduler_locks WHERE name = 'main_scheduler' AND process_id = #{Process.pid}"
        )
        Rails.logger.info "🔓 Released scheduler lock on exit"
      rescue => e
        Rails.logger.error "Error releasing scheduler lock: #{e.message}"
      end
    end

    # Khởi tạo scheduler
    Rails.logger.info "✅ Initializing scheduler in process #{Process.pid}"
    scheduler = SchedulerService.initialize_scheduler

    # Thêm một job để cập nhật heartbeat định kỳ
    scheduler.every '30s' do
      begin
        # Cập nhật heartbeat
        ActiveRecord::Base.connection.execute(
          "UPDATE scheduler_locks SET heartbeat_at = NOW() WHERE name = 'main_scheduler' AND process_id = #{Process.pid}"
        )
      rescue => e
        Rails.logger.error "Error updating scheduler heartbeat: #{e.message}"
      end
    end

    # Thêm một job để kiểm tra xem khóa có còn thuộc về process hiện tại không
    scheduler.every '1m' do
      begin
        # Kiểm tra xem khóa có còn thuộc về process hiện tại không
        result = ActiveRecord::Base.connection.execute(
          "SELECT process_id FROM scheduler_locks WHERE name = 'main_scheduler'"
        ).first

        if result.nil?
          # Nếu không tìm thấy khóa, thử lấy lại
          begin
            ActiveRecord::Base.connection.execute(
              "INSERT INTO scheduler_locks (name, process_id, locked_at) VALUES ('main_scheduler', #{Process.pid}, NOW())"
            )
            Rails.logger.info "🔒 Re-acquired scheduler lock for process #{Process.pid}"
          rescue
            # Nếu không lấy được khóa, dừng scheduler
            Rails.logger.info "🛑 Could not re-acquire lock, stopping scheduler in process #{Process.pid}"
            scheduler.shutdown
          end
        elsif result['process_id'] != Process.pid
          # Nếu khóa thuộc về process khác, dừng scheduler
          Rails.logger.info "🛑 Lock owned by process #{result['process_id']}, stopping scheduler in process #{Process.pid}"
          scheduler.shutdown
        end
      rescue => e
        Rails.logger.error "Error checking scheduler lock: #{e.message}"
      end
    end
  rescue ActiveRecord::RecordNotUnique, PG::UniqueViolation
    # Khóa đã tồn tại, một instance khác đã khởi tạo scheduler
    Rails.logger.info "⚠️ Scheduler already initialized in another process"

    # Hiển thị thông tin về process đang giữ khóa
    begin
      lock_info = ActiveRecord::Base.connection.execute(
        "SELECT process_id, locked_at, heartbeat_at FROM scheduler_locks WHERE name = 'main_scheduler'"
      ).first

      if lock_info
        Rails.logger.info "ℹ️ Lock held by process #{lock_info['process_id']} since #{lock_info['locked_at']}, last heartbeat: #{lock_info['heartbeat_at'] || 'none'}"
        Rails.logger.info "💡 To clear stale locks, run: rake scheduler:clear_locks"
      end
    rescue => e
      Rails.logger.error "Error getting lock info: #{e.message}"
    end
  rescue => e
    Rails.logger.error "❌ Error initializing scheduler: #{e.message}"
  end
end
