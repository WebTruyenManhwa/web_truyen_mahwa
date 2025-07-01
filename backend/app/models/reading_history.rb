class ReadingHistory < ApplicationRecord
  belongs_to :user
  belongs_to :chapter
  
  # Validations
  validates :user_id, uniqueness: { scope: :chapter_id }
  
  # Callbacks
  after_save :update_manga_view_count
  
  private
  
  def update_manga_view_count
    chapter.manga.increment!(:view_count) if chapter.manga.present?
  end
end
