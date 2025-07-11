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
    
    base_slug = title.parameterize
    new_slug = base_slug
    counter = 2
    
    # Kiểm tra xem slug đã tồn tại chưa
    while Manga.where(slug: new_slug).where.not(id: id).exists?
      new_slug = "#{base_slug}-#{counter}"
      counter += 1
    end
    
    self.slug = new_slug
  end
end
