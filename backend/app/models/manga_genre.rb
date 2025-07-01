class MangaGenre < ApplicationRecord
  belongs_to :manga
  belongs_to :genre
  
  # Validations
  validates :manga_id, uniqueness: { scope: :genre_id }
end
