class NotificationService
  # Tạo thông báo mới cho một hoặc nhiều người dùng
  def self.create_notification(options = {})
    # Xác thực các tham số bắt buộc
    unless options[:users].present? || options[:user].present?
      Rails.logger.error("NotificationService: No users specified for notification")
      return false
    end

    unless options[:title].present?
      Rails.logger.error("NotificationService: No title specified for notification")
      return false
    end

    unless options[:notification_type].present?
      Rails.logger.error("NotificationService: No notification_type specified for notification")
      return false
    end

    # Chuẩn bị danh sách người dùng
    users = if options[:users].present?
      options[:users]
    else
      [options[:user]]
    end

    # Tạo thông báo cho từng người dùng
    notifications = []

    users.each do |user|
      notification = Notification.create(
        user: user,
        title: options[:title],
        content: options[:content],
        read: false,
        notification_type: options[:notification_type],
        reference_id: options[:reference_id],
        reference_type: options[:reference_type]
      )

      notifications << notification if notification.persisted?
    end

    # Log kết quả
    Rails.logger.info("NotificationService: Created #{notifications.size} notifications")

    notifications
  end

  # Tạo thông báo cho tất cả admin
  def self.notify_admins(options = {})
    admin_users = User.where(role: ['admin', 'super_admin'])
    options[:users] = admin_users
    create_notification(options)
  end

  # Đánh dấu tất cả thông báo của một người dùng là đã đọc
  def self.mark_all_as_read(user)
    count = user.notifications.unread.update_all(read: true)
    Rails.logger.info("NotificationService: Marked #{count} notifications as read for user #{user.id}")
    count
  end
end
