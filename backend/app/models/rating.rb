class Rating < ApplicationRecord
  belongs_to :user
  belongs_to :manga

  validates :user_id, uniqueness: { scope: :manga_id }
  validates :value, presence: true, inclusion: { in: 1..5 }

  after_save :update_manga_rating
  after_destroy :update_manga_rating

  private

  def update_manga_rating
    # Tính lại rating trung bình và tổng số votes cho manga
    manga_ratings = manga.ratings
    total_votes = manga_ratings.count
    average_rating = total_votes > 0 ? manga_ratings.average(:value).to_f : 0

    # Log the rating calculation
    Rails.logger.info "=== Updating manga rating: manga_id=#{manga.id}, new_rating=#{average_rating}, total_votes=#{total_votes} ==="

    manga.update_columns(
      rating: average_rating,
      total_votes: total_votes
    )

    # Clear the cache for this manga to ensure fresh data is returned
    # Thay vì sử dụng delete_matched, sử dụng delete với cache key cụ thể
    cache_key = "mangas/show/#{manga.id}-#{manga.updated_at.to_i}-rating#{manga.rating}-votes#{manga.total_votes}"
    Rails.cache.delete(cache_key)
    Rails.logger.info "=== Cleared cache for manga: #{cache_key} ==="
  end
end
