class ApplicationRecord < ActiveRecord::Base
  primary_abstract_class

  # Đảm bảo các timestamp được lưu và hiển thị theo múi giờ của ứng dụng
  # Trong Rails 8, default_timezone đã bị loại bỏ
end
