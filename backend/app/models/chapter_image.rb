class ChapterImage < ApplicationRecord
  belongs_to :chapter
  
  # CarrierWave
  mount_uploader :image, ChapterImageUploader, if: :should_mount_uploader?
  
  # Validations
  validates :position, presence: true, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :external_url, presence: true, if: :is_external?
  validates :external_url, format: { with: URI::regexp(%w[http https]), message: "phải là một URL hợp lệ" }, if: :external_url?
  validates :image, presence: true, unless: :is_external?
  
  # Scopes
  scope :ordered, -> { order(position: :asc) }
  
  private
  
  def should_mount_uploader?
    !is_external?
  end
end
