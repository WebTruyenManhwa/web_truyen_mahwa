class Comment < ApplicationRecord
  belongs_to :user
  belongs_to :commentable, polymorphic: true
  
  # Validations
  validates :content, presence: true
  
  # Scopes
  scope :recent, -> { order(created_at: :desc) }
end
