class Notification < ApplicationRecord
  belongs_to :user

  # Validations
  validates :title, presence: true
  validates :notification_type, presence: true

  # Scopes
  scope :unread, -> { where(read: false) }
  scope :read, -> { where(read: true) }
  scope :recent, -> { order(created_at: :desc) }
  scope :by_type, ->(type) { where(notification_type: type) }

  # Notification types
  TYPES = {
    manga_crawl: 'manga_crawl',
    manga_crawl_error: 'manga_crawl_error',
    chapter_error_report: 'chapter_error_report',
    system: 'system'
  }

  # Mark notification as read
  def mark_as_read!
    update(read: true)
  end

  # Mark notification as unread
  def mark_as_unread!
    update(read: false)
  end

  # Get referenced object if available
  def reference_object
    return nil unless reference_type.present? && reference_id.present?

    reference_class = reference_type.constantize rescue nil
    return nil unless reference_class

    reference_class.find_by(id: reference_id)
  end
end
