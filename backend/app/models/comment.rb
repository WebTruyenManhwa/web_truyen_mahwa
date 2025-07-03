class Comment < ApplicationRecord
  belongs_to :user
  belongs_to :commentable, polymorphic: true
  belongs_to :parent, class_name: 'Comment', optional: true
  has_many :replies, class_name: 'Comment', foreign_key: 'parent_id', dependent: :destroy
  
  # Validations
  validates :content, presence: true, unless: :has_sticker?
  
  # Scopes
  scope :recent, -> { order(created_at: :desc) }
  scope :root_comments, -> { where(parent_id: nil) }
  
  # Check if comment has sticker
  def has_sticker?
    sticker.present?
  end
end
