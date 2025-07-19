# Đảm bảo múi giờ được cấu hình đúng cho Rails
# Đặt múi giờ mặc định cho ActiveRecord khi lưu vào database
# Trong Rails 8, default_timezone đã bị loại bỏ, sử dụng cấu hình trong application.rb

# Đặt múi giờ cho các câu query SQL
ActiveRecord::Base.connection.execute("SET timezone TO 'Asia/Ho_Chi_Minh'") if ActiveRecord::Base.connection.active?

# Đăng ký hook để đặt timezone mỗi khi kết nối database
ActiveSupport.on_load(:active_record) do
  ActiveRecord::ConnectionAdapters::AbstractAdapter.set_callback :checkout, :after do |conn|
    conn.execute("SET timezone TO 'Asia/Ho_Chi_Minh'") if conn.active?
  end
end

# Log thông tin múi giờ
Rails.logger.info "Rails timezone: #{Time.zone.name}"
begin
  timezone = ActiveRecord::Base.connection.execute("SHOW timezone").first["timezone"]
  Rails.logger.info "Database timezone: #{timezone}"
rescue => e
  Rails.logger.error "Could not get database timezone: #{e.message}"
end
