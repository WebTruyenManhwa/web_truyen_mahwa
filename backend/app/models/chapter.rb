class Chapter < ApplicationRecord
  belongs_to :manga
  
  # Associations
  has_many :chapter_images, -> { order(position: :asc) }, dependent: :destroy
  has_many :reading_histories, dependent: :destroy
  has_many :comments, as: :commentable, dependent: :destroy
  
  # Validations
  validates :title, presence: true
  validates :number, presence: true, uniqueness: { scope: :manga_id }
  
  # Scopes
  scope :ordered, -> { order(number: :asc) }
  
  # Callbacks
  before_create :set_defaults
  after_create :update_manga_updated_at
  
  private
  
  def set_defaults
    self.view_count ||= 0
  end
  
  def update_manga_updated_at
    manga.touch if manga.present?
  end
end
