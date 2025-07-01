class ChapterImage < ApplicationRecord
  belongs_to :chapter
  
  # CarrierWave
  mount_uploader :image, ChapterImageUploader
  
  # Validations
  validates :image, presence: true
  validates :position, presence: true, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  
  # Scopes
  scope :ordered, -> { order(position: :asc) }
end
