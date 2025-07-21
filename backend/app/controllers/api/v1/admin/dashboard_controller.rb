module Api
  module V1
    module Admin
      class DashboardController < BaseController
        before_action :authenticate_user!
        before_action :authorize_admin

        def stats
          # Tính toán các thống kê
          total_mangas = Manga.count
          total_users = User.count
          total_views = Manga.sum(:view_count)

          # Thống kê hôm nay
          today = Date.today.beginning_of_day
          new_users_today = User.where('created_at >= ?', today).count
          new_mangas_today = Manga.where('created_at >= ?', today).count

          # Lượt xem hôm nay (ước tính từ lịch sử đọc)
          views_today = Chapter.where('updated_at >= ?', today).sum(:view_count)

          # Truyện mới cập nhật
          recent_mangas = Manga.includes(:chapters)
                              .order(updated_at: :desc)
                              .limit(5)
                              .map do |manga|
            {
              id: manga.id,
              title: manga.title,
              slug: manga.slug,
              chapters: manga.chapters.count,
              view_count: manga.view_count,
              status: manga.status,
              updatedAt: manga.updated_at
            }
          end

          # Người dùng mới đăng ký
          recent_users = User.order(created_at: :desc)
                            .limit(5)
                            .map do |user|
            {
              id: user.id,
              username: user.username,
              email: user.email,
              registeredAt: user.created_at,
              role: user.role
            }
          end

          render json: {
            dashboardStats: {
              totalMangas: total_mangas,
              totalUsers: total_users,
              totalViews: total_views,
              newUsersToday: new_users_today,
              newMangasToday: new_mangas_today,
              viewsToday: views_today
            },
            recentMangas: recent_mangas,
            recentUsers: recent_users
          }
        end

        # Backup database
        def backup_database
          # Kiểm tra quyền super_admin
          unless current_user&.super_admin?
            return render json: { error: "Bạn không có quyền thực hiện thao tác này" }, status: :forbidden
          end

          begin
            timestamp = Time.current.strftime("%Y%m%d%H%M%S_%L")
            filename = "database_backup_#{timestamp}.sql"
            filepath = Rails.root.join("tmp", filename)

            # Lưu đường dẫn file vào biến instance để có thể xóa sau khi gửi xong
            @backup_filepath = filepath

            Rails.logger.info "Starting database backup to file: #{filepath}"

            # Lấy thông tin kết nối database từ config
            db_config = ActiveRecord::Base.connection_db_config.configuration_hash

            # Kiểm tra xem có đang sử dụng DATABASE_URL không
            if Rails.env.production? && ENV['DATABASE_URL'].present?
              # Parse DATABASE_URL để lấy thông tin kết nối
              db_uri = URI.parse(ENV['DATABASE_URL'])
              db_params = {
                host: db_uri.host,
                port: db_uri.port || 5432,
                username: db_uri.user,
                password: db_uri.password,
                database: db_uri.path[1..-1] # Bỏ dấu / ở đầu
              }

              Rails.logger.info "Using DATABASE_URL for backup: #{ENV['DATABASE_URL'].gsub(/:[^:]*@/, ':****@')}"

              # Tạo lệnh pg_dump với thông tin từ DATABASE_URL
              cmd = [
                "PGPASSWORD=#{db_params[:password]}",
                "pg_dump",
                "-h", db_params[:host],
                "-p", db_params[:port],
                "-U", db_params[:username],
                "-F", "p", # Format: plain text
                "--no-owner", # Không bao gồm thông tin owner
                "--no-acl", # Không bao gồm thông tin quyền
                # Thêm các tùy chọn để giới hạn kích thước
                "--data-only", # Chỉ export dữ liệu, không export schema
                "-T", "scheduler_locks", # Exclude scheduler_locks table
                "-f", filepath.to_s,
                db_params[:database]
              ].join(" ")
            else
              Rails.logger.info "Using database.yml configuration for backup"

              # Sử dụng cấu hình từ database.yml như trước
              cmd = [
                "PGPASSWORD=#{db_config[:password]}",
                "pg_dump",
                "-h", db_config[:host],
                "-p", db_config[:port] || "5432",
                "-U", db_config[:username],
                "-F", "p", # Format: plain text
                "--no-owner", # Không bao gồm thông tin owner
                "--no-acl", # Không bao gồm thông tin quyền
                # Thêm các tùy chọn để giới hạn kích thước
                "--data-only", # Chỉ export dữ liệu, không export schema
                "-T", "scheduler_locks", # Exclude scheduler_locks table
                "-f", filepath.to_s,
                db_config[:database]
              ].join(" ")
            end

            # Thực hiện lệnh backup
            Rails.logger.info "Executing backup command: #{cmd.gsub(/PGPASSWORD=\S+/, 'PGPASSWORD=[FILTERED]')}"
            result = system(cmd)

            unless result
              Rails.logger.error "pg_dump command failed with exit code: #{$?.exitstatus}"
              return render json: { error: "Lệnh pg_dump thất bại với mã lỗi: #{$?.exitstatus}" }, status: :internal_server_error
            end

            if File.exist?(filepath)
              file_size = File.size(filepath)
              Rails.logger.info "Backup file created successfully: #{filepath} (Size: #{file_size} bytes)"

              if file_size == 0
                Rails.logger.error "Backup file is empty!"
                return render json: { error: "File backup rỗng" }, status: :internal_server_error
              end

              # Nén file để giảm kích thước
              gzip_filepath = "#{filepath}.gz"
              gzip_cmd = "gzip -c #{filepath} > #{gzip_filepath}"
              Rails.logger.info "Compressing backup file: #{gzip_cmd}"
              system(gzip_cmd)

              if File.exist?(gzip_filepath)
                compressed_size = File.size(gzip_filepath)
                Rails.logger.info "Compressed backup file: #{gzip_filepath} (Size: #{compressed_size} bytes, Ratio: #{(compressed_size.to_f / file_size * 100).round(2)}%)"

                # Gửi file nén về client
                response.headers['Content-Description'] = 'File Transfer'
                response.headers['Cache-Control'] = 'no-cache'
                response.headers['Content-Type'] = 'application/gzip'
                response.headers['Content-Disposition'] = "attachment; filename=\"#{filename}.gz\""
                response.headers['Content-Length'] = compressed_size.to_s
                response.headers['X-Accel-Buffering'] = 'no' # Tắt buffering cho Nginx

                Rails.logger.info "Sending compressed file to client with headers: #{response.headers.to_h}"

                # Lưu thời gian tạo file để tính toán thời gian xóa
                @backup_created_at = Time.current

                # Gửi file với chunk size nhỏ hơn
                send_file gzip_filepath,
                          type: 'application/gzip',
                          disposition: 'attachment',
                          filename: "#{filename}.gz",
                          stream: true,
                          buffer_size: 4096 # Giảm kích thước buffer

                # Đăng ký xóa cả file gốc và file nén
                @backup_filepath_gz = gzip_filepath

                # Đặt lịch xóa file sau 2 phút
                schedule_file_cleanup(filepath, gzip_filepath)
              else
                Rails.logger.error "Failed to compress backup file"

                # Gửi file gốc về client
                response.headers['Content-Description'] = 'File Transfer'
                response.headers['Cache-Control'] = 'no-cache'
                response.headers['Content-Type'] = 'application/sql'
                response.headers['Content-Disposition'] = "attachment; filename=\"#{filename}\""
                response.headers['Content-Length'] = file_size.to_s
                response.headers['X-Accel-Buffering'] = 'no' # Tắt buffering cho Nginx

                Rails.logger.info "Sending file to client with headers: #{response.headers.to_h}"

                # Lưu thời gian tạo file để tính toán thời gian xóa
                @backup_created_at = Time.current

                # Gửi file với chunk size nhỏ hơn
                send_file filepath,
                          type: 'application/sql',
                          disposition: 'attachment',
                          filename: filename,
                          stream: true,
                          buffer_size: 4096 # Giảm kích thước buffer

                # Đặt lịch xóa file sau 2 phút
                schedule_file_cleanup(filepath)
              end
            else
              Rails.logger.error "Backup file not created: #{filepath}"
              render json: { error: "Không thể tạo file backup" }, status: :unprocessable_entity
            end
          rescue => e
            Rails.logger.error "Backup database error: #{e.message}\n#{e.backtrace.join("\n")}"
            render json: { error: "Đã xảy ra lỗi: #{e.message}" }, status: :unprocessable_entity
          end
        end

        private

        def authorize_admin
          unless current_user.admin? || current_user.super_admin?
            render json: { error: 'Unauthorized' }, status: :unauthorized
          end
        end

        # Đặt lịch xóa file sau một khoảng thời gian
        def schedule_file_cleanup(*filepaths)
          # Sử dụng SchedulerService để xóa file sau một khoảng thời gian
          SchedulerService.schedule_job(
            DeleteBackupFilesJob,
            [filepaths],
            2.minutes.from_now
          )
          Rails.logger.info "Scheduled file cleanup after 2 minutes for: #{filepaths.join(', ')}"
        end

      end
    end
  end
end

