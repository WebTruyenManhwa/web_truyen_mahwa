class MangaView < ApplicationRecord
  belongs_to :manga

  validates :view_date, presence: true
  validates :view_count, numericality: { greater_than_or_equal_to: 0 }
  validates :manga_id, uniqueness: { scope: :view_date, message: "should have only one view record per day" }

  # Class method to increment view count for a manga on a specific date
  def self.increment_view(manga_id, date = Date.today)
    # Find or create a record for this manga and date
    record = find_or_initialize_by(manga_id: manga_id, view_date: date)

    # Increment the view count
    record.view_count = (record.view_count || 0) + 1
    record.save!

    # Also increment the manga's total view count
    manga = Manga.find(manga_id)
    manga.increment!(:view_count)

    record
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
