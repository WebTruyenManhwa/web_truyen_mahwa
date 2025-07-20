# Cấu hình timezone cho Rails và ActiveRecord
# Đảm bảo múi giờ được cấu hình đúng cho cả Rails và PostgreSQL

# Trong Rails 8, ActiveRecord::Base.default_timezone đã bị loại bỏ
# Thay vào đó, sử dụng cấu hình trong application.rb và database.yml

# Thiết lập timezone khi ứng dụng khởi động
Rails.application.config.after_initialize do
  # Ghi log thông tin timezone hiện tại
  Rails.logger.info "⏰ Timezone configuration:"
  Rails.logger.info "⏰ Rails.application.config.time_zone: #{Rails.application.config.time_zone}"
  Rails.logger.info "⏰ Time.zone.name: #{Time.zone.name}"
  Rails.logger.info "⏰ ENV['TZ']: #{ENV['TZ']}"
  Rails.logger.info "⏰ Time.now: #{Time.now}"
  Rails.logger.info "⏰ Time.current: #{Time.current}"

  # Kiểm tra timezone của database
  begin
    if ActiveRecord::Base.connection.active?
      db_timezone = ActiveRecord::Base.connection.execute("SHOW timezone").first["timezone"]
      Rails.logger.info "⏰ Database timezone: #{db_timezone}"

      # Nếu timezone không đúng, thiết lập lại
      if db_timezone != 'Asia/Ho_Chi_Minh'
        Rails.logger.warn "⚠️ Database timezone mismatch! Setting to Asia/Ho_Chi_Minh"
        ActiveRecord::Base.connection.execute("SET timezone TO 'Asia/Ho_Chi_Minh'")
      end
    end
  rescue => e
    Rails.logger.error "❌ Error checking database timezone: #{e.message}"
  end
end
