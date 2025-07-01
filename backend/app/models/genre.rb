class Genre < ApplicationRecord
  # Associations
  has_many :manga_genres, dependent: :destroy
  has_many :mangas, through: :manga_genres
  
  # Validations
  validates :name, presence: true, uniqueness: true
end
