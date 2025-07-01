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

  # Validations
  validates :title, presence: true
  validates :status, presence: true
  
  # Scopes
  scope :popular, -> { order(view_count: :desc) }
  scope :recent, -> { order(created_at: :desc) }
  scope :alphabetical, -> { order(title: :asc) }
  
  # Callbacks
  before_create :set_defaults
  
  private
  
  def set_defaults
    self.view_count ||= 0
  end
end
