class ReadingHistory < ApplicationRecord
  belongs_to :user
  belongs_to :manga
  belongs_to :chapter
  
  # Validations
  validates :user_id, uniqueness: { scope: [:manga_id, :chapter_id] }
  
  # Callbacks
  after_save :update_manga_view_count
  before_save :set_last_read_at
  private
  
  def update_manga_view_count
    chapter.manga.increment!(:view_count) if chapter.manga.present?
  end
  def set_last_read_at
    self.last_read_at = Time.current
  end
end
