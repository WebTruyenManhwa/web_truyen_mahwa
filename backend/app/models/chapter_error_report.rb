class ChapterErrorReport < ApplicationRecord
  belongs_to :chapter
  belongs_to :user, optional: true

  # Validations
  validates :error_type, presence: true
  validates :description, presence: true, length: { maximum: 1000 }

  # Scopes
  scope :recent, -> { order(created_at: :desc) }
  scope :unresolved, -> { where(resolved: false) }
  scope :resolved, -> { where(resolved: true) }

  # Error types
  TYPES = [
    "missing_images",
    "wrong_order",
    "low_quality",
    "wrong_chapter",
    "broken_images",
    "incorrect_translation",
    "other"
  ]

  validates :error_type, inclusion: { in: TYPES }

  def resolve!
    update(resolved: true, resolved_at: Time.current)
  end
end
