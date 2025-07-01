class Favorite < ApplicationRecord
  belongs_to :user
  belongs_to :manga
  
  # Validations
  validates :user_id, uniqueness: { scope: :manga_id }
end
