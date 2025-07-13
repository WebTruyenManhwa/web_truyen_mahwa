class Manga < ApplicationRecord
  # CarrierWave
  mount_uploader :cover_image, CoverImageUploader

  # Enums
  enum :status, { ongoing: 0, completed: 1, hiatus: 2, cancelled: 3 }

  # Associations
  has_many :chapters, dependent: :destroy
  has_many :manga_genres, dependent: :destroy
  has_many :genres, through: :manga_genres
  has_many :favorites, dependent: :destroy
  has_many :comments, as: :commentable, dependent: :destroy
  has_many :ratings, dependent: :destroy
  has_many :manga_views, dependent: :destroy

  # Validations
  validates :title, presence: true
  validates :status, presence: true
  validates :slug, uniqueness: true, allow_blank: true

  # Scopes
  scope :popular, -> { order(view_count: :desc) }
  scope :recent, -> { order(created_at: :desc) }
  scope :alphabetical, -> { order(title: :asc) }
  scope :top_rated, -> { where('total_votes > 0').order(rating: :desc) }

  # Callbacks
  before_create :set_defaults
  before_save :set_slug

  # Track a new view for this manga
  def track_view
    begin
      MangaView.increment_view(id)
    rescue => e
      # Log error but don't let it affect user experience
      Rails.logger.error "Error tracking manga view: #{e.message}"
      # Increment the counter directly if possible
      begin
        self.increment!(:view_count)
      rescue => inner_e
        Rails.logger.error "Failed to increment manga view count directly: #{inner_e.message}"
      end
      nil
    end
  end

  # Get views for today - tối ưu để giảm sử dụng RAM
  def views_for_day(date = Date.today)
    begin
      # Cache kết quả trong 1 giờ để giảm truy vấn database
      Rails.cache.fetch("manga/#{id}/views/day/#{date}", expires_in: 1.hour) do
        # Sử dụng SQL count thay vì tải tất cả records vào memory
        MangaView.where(manga_id: id)
                .where('DATE(created_at) = ?', date)
                .sum(:view_count)
      end
    rescue => e
      Rails.logger.error "Error getting daily views: #{e.message}"
      0 # Return 0 as fallback
    end
  end

  # Get views for the past week - tối ưu để giảm sử dụng RAM
  def views_for_week(end_date = Date.today)
    begin
      # Cache kết quả trong 1 giờ để giảm truy vấn database
      Rails.cache.fetch("manga/#{id}/views/week/#{end_date}", expires_in: 1.hour) do
        # Sử dụng SQL sum thay vì tải tất cả records vào memory
        start_date = end_date - 6.days
        MangaView.where(manga_id: id)
                .where('DATE(created_at) BETWEEN ? AND ?', start_date, end_date)
                .sum(:view_count)
      end
    rescue => e
      Rails.logger.error "Error getting weekly views: #{e.message}"
      0 # Return 0 as fallback
    end
  end

  # Get views for the past month - tối ưu để giảm sử dụng RAM
  def views_for_month(end_date = Date.today)
    begin
      # Cache kết quả trong 1 giờ để giảm truy vấn database
      Rails.cache.fetch("manga/#{id}/views/month/#{end_date}", expires_in: 1.hour) do
        # Sử dụng SQL sum thay vì tải tất cả records vào memory
        start_date = end_date - 29.days
        MangaView.where(manga_id: id)
                .where('DATE(created_at) BETWEEN ? AND ?', start_date, end_date)
                .sum(:view_count)
      end
    rescue => e
      Rails.logger.error "Error getting monthly views: #{e.message}"
      0 # Return 0 as fallback
    end
  end

  def update_rating_stats
    if ratings.any?
      update_columns(
        rating: ratings.average(:value).round(2),
        total_votes: ratings.count
      )
    else
      update_columns(rating: 0, total_votes: 0)
    end
  end

  def to_param
    slug
  end

  private

  def set_defaults
    self.view_count ||= 0
    self.rating ||= 0
    self.total_votes ||= 0
  end

  def set_slug
    return if slug.present?

    base_slug = title.to_s.parameterize
    temp_slug = base_slug
    counter = 0

    # Kiểm tra xem slug đã tồn tại chưa, nếu có thì thêm số vào sau
    while Manga.where(slug: temp_slug).where.not(id: id).exists?
      counter += 1
      temp_slug = "#{base_slug}-#{counter}"
    end

    self.slug = temp_slug
  end
end
