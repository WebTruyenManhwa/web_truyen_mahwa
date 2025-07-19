class ScheduledCrawl < ApplicationRecord
  belongs_to :manga

  # Constants
  SCHEDULE_TYPES = %w[daily weekly monthly].freeze
  STATUS_TYPES = %w[active paused completed].freeze

  # Validations
  validates :url, presence: true
  validates :schedule_type, presence: true, inclusion: { in: SCHEDULE_TYPES }
  validates :status, inclusion: { in: STATUS_TYPES }
  validates :schedule_time, presence: true
  validates :schedule_days, presence: true, if: -> { schedule_type == 'weekly' }

  # Scopes
  scope :active, -> { where(status: 'active') }
  scope :due_for_run, -> { active.where('next_run_at <= ?', Time.current) }

  # Callbacks
  after_create :set_next_run_time
  after_update :set_next_run_time, if: -> { saved_change_to_schedule_type? || saved_change_to_schedule_time? || saved_change_to_schedule_days? }

  # Cập nhật thời gian chạy tiếp theo dựa trên lịch
  def set_next_run_time
    self.next_run_at = calculate_next_run_time
    save
  end

  # Tính toán thời gian chạy tiếp theo dựa trên lịch
  def calculate_next_run_time
    now = Time.current
    time_of_day = schedule_time || Time.parse('00:00')

    Rails.logger.info "Calculating next run time for scheduled crawl ##{id}. Current time: #{now}, Schedule time: #{time_of_day}"

    case schedule_type
    when 'daily'
      # Nếu thời gian đã qua trong ngày, chạy vào ngày mai
      if now.hour > time_of_day.hour || (now.hour == time_of_day.hour && now.min >= time_of_day.min)
        next_run = now.beginning_of_day + 1.day
        Rails.logger.info "Daily schedule: Time already passed today, scheduling for tomorrow"
      else
        next_run = now.beginning_of_day
        Rails.logger.info "Daily schedule: Time not passed today, scheduling for today"
      end
      result = next_run + time_of_day.hour.hours + time_of_day.min.minutes
      Rails.logger.info "Calculated next run time: #{result}"
      return result

    when 'weekly'
      # Lấy các ngày trong tuần cần chạy
      days = schedule_days.split(',').map(&:to_i)

      # Tìm ngày tiếp theo trong tuần cần chạy
      current_wday = now.wday
      next_days = days.select { |d| d > current_wday }

      if next_days.any?
        # Có ngày trong tuần này
        days_to_add = next_days.min - current_wday
      else
        # Không có ngày nào trong tuần này, chạy vào tuần sau
        days_to_add = 7 - current_wday + days.min
      end

      # Nếu là cùng ngày nhưng đã qua giờ, đẩy sang tuần sau
      if days_to_add == 0 && (now.hour > time_of_day.hour || (now.hour == time_of_day.hour && now.min >= time_of_day.min))
        days_to_add = 7
      end

      next_run = now.beginning_of_day + days_to_add.days
      next_run + time_of_day.hour.hours + time_of_day.min.minutes

    when 'monthly'
      # Chạy vào ngày đầu tiên của tháng tiếp theo
      day_of_month = 1

      if now.day > day_of_month || (now.day == day_of_month && (now.hour > time_of_day.hour || (now.hour == time_of_day.hour && now.min >= time_of_day.min)))
        next_run = now.beginning_of_month.next_month
      else
        next_run = now.beginning_of_month
      end

      next_run + (day_of_month - 1).days + time_of_day.hour.hours + time_of_day.min.minutes
    else
      now
    end
  end

  # Chạy crawl theo lịch
  def execute
    # Cập nhật thời gian chạy lần cuối
    update(last_run_at: Time.current)

    # Chuẩn bị options cho crawl
    options = {}

    # Xử lý max_chapters
    if max_chapters.present?
      if max_chapters.downcase == 'all'
        options[:max_chapters] = nil
      else
        options[:max_chapters] = max_chapters.to_i
      end
    end

    # Xử lý chapter_range
    if chapter_range.present?
      range_match = chapter_range.match(/^(\d+)-(\d+)$/)
      if range_match
        options[:chapter_range] = {
          start: range_match[1].to_i,
          end: range_match[2].to_i
        }
      end
    end

    # Xử lý delay
    if delay.present? && delay.include?('..')
      min, max = delay.split('..').map(&:to_i)
      options[:delay] = min..max if min && max && min < max
    end

    # Chạy crawl
    CrawlMangaJob.perform_later(url, options)

    # Cập nhật thời gian chạy tiếp theo
    set_next_run_time
  end

  # Chuyển đổi sang hash để trả về API
  def as_json(options = {})
    super(options.merge(
      methods: [:manga_title],
      except: [:created_at, :updated_at]
    ))
  end

  # Lấy tiêu đề manga
  def manga_title
    manga&.title
  end
end
