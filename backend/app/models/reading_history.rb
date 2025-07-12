class ReadingHistory < ApplicationRecord
  belongs_to :user
  belongs_to :manga
  belongs_to :chapter

  # Validations
  validates :user_id, uniqueness: { scope: [:manga_id, :chapter_id] }

  # Callbacks
  # Removed update_manga_view_count callback since we now handle view counts in ChaptersController
  before_save :set_last_read_at

  private

  def set_last_read_at
    self.last_read_at = Time.current
  end
end
