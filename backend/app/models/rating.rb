class Rating < ApplicationRecord
  belongs_to :user
  belongs_to :manga

  validates :user_id, uniqueness: { scope: :manga_id }
  validates :value, presence: true, inclusion: { in: 1..5 }

  after_save :update_manga_rating
  after_destroy :update_manga_rating

  private

  def update_manga_rating
    manga.update_rating_stats
  end
end 