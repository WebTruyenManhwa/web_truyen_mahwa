class ScheduledJob < ApplicationRecord
  # Constants
  JOB_TYPES = ['scheduled_crawl_check', 'single_job'].freeze
  JOB_STATUSES = ['pending', 'running', 'completed', 'failed'].freeze

  # Validations
  validates :job_type, presence: true, inclusion: { in: JOB_TYPES }
  validates :status, presence: true, inclusion: { in: JOB_STATUSES }
  validates :scheduled_at, presence: true

  # Scopes
  scope :pending, -> { where(status: 'pending') }
  scope :running, -> { where(status: 'running') }
  scope :completed, -> { where(status: 'completed') }
  scope :failed, -> { where(status: 'failed') }
  scope :due, -> { where('scheduled_at <= ?', Time.current) }
  scope :pending_and_due, -> { pending.due }

  # Tìm hoặc tạo job theo loại và thời gian
  def self.find_or_create_for_schedule(job_type, scheduled_at, options = {})
    # Tìm job có cùng loại và thời gian
    job = where(job_type: job_type)
          .where('scheduled_at = ?', scheduled_at)
          .first

    # Nếu không tìm thấy, tạo mới
    unless job
      job = create(
        job_type: job_type,
        status: 'pending',
        scheduled_at: scheduled_at,
        options: options
      )
    end

    job
  end

  # Đánh dấu job đang chạy
  def mark_as_running
    update(
      status: 'running',
      started_at: Time.current,
      lock_token: generate_lock_token
    )
  end

  # Đánh dấu job đã hoàn thành
  def mark_as_completed(result = nil)
    update(
      status: 'completed',
      completed_at: Time.current,
      result: result,
      lock_token: nil
    )
  end

  # Đánh dấu job thất bại
  def mark_as_failed(error_message)
    update(
      status: 'failed',
      completed_at: Time.current,
      error_message: error_message,
      lock_token: nil
    )

    # Tăng số lần retry
    increment!(:retry_count)

    # Nếu chưa đạt số lần retry tối đa, lên lịch lại
    if retry_count < max_retries
      # Tính thời gian retry với backoff
      next_run = Time.current + (2**retry_count).minutes

      # Tạo job mới
      self.class.create(
        job_type: job_type,
        status: 'pending',
        scheduled_at: next_run,
        options: options,
        parent_job_id: id,
        retry_count: retry_count,
        max_retries: max_retries
      )
    end
  end

  # Kiểm tra xem job có đang bị lock không
  def locked?
    lock_token.present? && status == 'running'
  end

  # Kiểm tra xem lock có hết hạn chưa
  def lock_expired?
    return false unless locked?
    return false unless started_at.present?

    # Lock hết hạn sau 30 phút
    Time.current > (started_at + 30.minutes)
  end

  # Tạo token để lock job
  def generate_lock_token
    SecureRandom.uuid
  end

  # Chuyển đổi options từ JSON sang hash
  def options
    return {} unless self[:options].present?

    begin
      JSON.parse(self[:options]).symbolize_keys
    rescue JSON::ParserError
      {}
    end
  end

  # Lưu options dưới dạng JSON
  def options=(value)
    self[:options] = value.to_json if value.present?
  end
end
