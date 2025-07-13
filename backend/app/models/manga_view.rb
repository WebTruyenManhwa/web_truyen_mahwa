class MangaView < ApplicationRecord
  belongs_to :manga

  validates :view_date, presence: true
  validates :view_count, numericality: { greater_than_or_equal_to: 0 }
  validates :manga_id, uniqueness: { scope: :view_date, message: "should have only one view record per day" }

  # Class method to increment view count for a manga on a specific date
  def self.increment_view(manga_id, date = Date.today)
    # Use a transaction with retry logic to handle race conditions
    attempts = 0
    max_attempts = 3

    begin
      attempts += 1

      # Try to find an existing record first
      record = find_by(manga_id: manga_id, view_date: date)

      if record
        # If record exists, use update_counters which is atomic
        MangaView.update_counters(record.id, view_count: 1)
      else
        # If no record, create a new one with view_count = 1
        record = create!(manga_id: manga_id, view_date: date, view_count: 1)
      end

      # Also increment the manga's total view count (this is separate from the unique constraint)
      Manga.update_counters(manga_id, view_count: 1)

      return record
    rescue ActiveRecord::RecordNotUnique => e
      # If we get a unique constraint violation, retry if we haven't exceeded max attempts
      if attempts < max_attempts
        Rails.logger.info "Retrying increment_view for manga_id=#{manga_id} after RecordNotUnique (attempt #{attempts})"
        retry
      else
        Rails.logger.error "Failed to increment view after #{max_attempts} attempts: #{e.message}"
        raise e
      end
    end
  end

  # Get views for a manga within a date range
  def self.views_in_range(manga_id, start_date, end_date)
    where(manga_id: manga_id, view_date: start_date..end_date).sum(:view_count)
  end

  # Get views for a manga for a specific day
  def self.views_for_day(manga_id, date = Date.today)
    where(manga_id: manga_id, view_date: date).sum(:view_count)
  end

  # Get views for a manga for the past week
  def self.views_for_week(manga_id, end_date = Date.today)
    start_date = end_date - 6.days
    views_in_range(manga_id, start_date, end_date)
  end

  # Get views for a manga for the past month
  def self.views_for_month(manga_id, end_date = Date.today)
    start_date = end_date - 29.days
    views_in_range(manga_id, start_date, end_date)
  end
end
