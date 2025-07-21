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

    # Chuyển đổi schedule_time từ chuỗi thành đối tượng Time trong múi giờ hiện tại
    time_of_day = if schedule_time.is_a?(String)
                    # Đảm bảo thời gian được parse trong múi giờ hiện tại
                    Time.zone.parse(schedule_time)
                  else
                    schedule_time || Time.zone.parse('00:00')
                  end

    Rails.logger.info "Calculating next run time for scheduled crawl ##{id}."
    Rails.logger.info "Current time: #{now} (UTC: #{now.utc})"
    Rails.logger.info "Schedule time: #{time_of_day} (hour: #{time_of_day.hour}, min: #{time_of_day.min})"

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
      Rails.logger.info "Calculated next run time: #{result} (UTC: #{result.utc})"
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
      result = next_run + time_of_day.hour.hours + time_of_day.min.minutes
      Rails.logger.info "Weekly schedule: Next run at #{result} (UTC: #{result.utc})"
      return result

    when 'monthly'
      # Chạy vào ngày đầu tiên của tháng tiếp theo
      day_of_month = 1

      if now.day > day_of_month || (now.day == day_of_month && (now.hour > time_of_day.hour || (now.hour == time_of_day.hour && now.min >= time_of_day.min)))
        next_run = now.beginning_of_month.next_month
      else
        next_run = now.beginning_of_month
      end

      result = next_run + (day_of_month - 1).days + time_of_day.hour.hours + time_of_day.min.minutes
      Rails.logger.info "Monthly schedule: Next run at #{result} (UTC: #{result.utc})"
      return result
    else
      Rails.logger.info "Unknown schedule type: #{schedule_type}, using current time"
      return now
    end
  end

  # Chạy crawl theo lịch
  def execute
    # Cập nhật thời gian chạy lần cuối
    update(last_run_at: Time.current)

    # Chuẩn bị options cho crawl
    options = {
      auto_next_chapters: true  # Mặc định bật auto_next_chapters
    }

    # Xử lý max_chapters
    if max_chapters.present?
      if max_chapters.downcase == 'all'
        options[:max_chapters] = 'all'
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
      options[:delay] = delay
    end

    # Tạo một scheduled job trong database thay vì sử dụng ActiveJob
    # Đảm bảo thời gian chạy là thời gian hiện tại trong múi giờ của ứng dụng
    current_time = Time.current
    
    # Quan trọng: Khi lưu thời gian từ schedule_time sang scheduled_jobs,
    # cần đảm bảo múi giờ được xử lý đúng
    # Nếu schedule_time là chuỗi (ví dụ: "11:38:00"), chuyển đổi thành đối tượng Time trong múi giờ hiện tại
    if schedule_time.is_a?(String)
      # Lấy ngày hiện tại và giờ từ schedule_time
      time_parts = schedule_time.split(':').map(&:to_i)
      hour = time_parts[0]
      minute = time_parts[1]
      second = time_parts[2] || 0
      
      # Tạo đối tượng Time với ngày hiện tại và giờ từ schedule_time, trong múi giờ hiện tại
      current_time = Time.zone.now.change(hour: hour, min: minute, sec: second)
      
      Rails.logger.info "Using schedule_time: #{schedule_time} to create job at: #{current_time} (UTC: #{current_time.utc}) (Zone: #{Time.zone.name})"
    else
      Rails.logger.info "Using current time: #{current_time} (UTC: #{current_time.utc}) (Zone: #{Time.zone.name})"
    end
    
    scheduled_job = SchedulerService.schedule_job(
      'CrawlMangaJob',
      [url, options],
      current_time
    )

    Rails.logger.info "Scheduled crawl ##{id} for manga '#{manga_title}' created job ##{scheduled_job.id} with scheduled_at: #{scheduled_job.scheduled_at} (UTC: #{scheduled_job.scheduled_at.utc})"

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
