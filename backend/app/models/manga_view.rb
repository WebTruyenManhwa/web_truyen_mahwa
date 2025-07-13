class MangaView < ApplicationRecord
  belongs_to :manga

  # Tăng lượt xem cho manga
  def self.increment_view(manga_id)
    today = Date.today
    view = find_or_initialize_by(manga_id: manga_id, created_at: today.beginning_of_day..today.end_of_day)

    if view.new_record?
      view.view_count = 1
      view.save
    else
      # Sử dụng update_column để tránh callbacks và validations
      view.update_column(:view_count, view.view_count + 1)
    end

    # Cập nhật tổng lượt xem của manga
    manga = Manga.find(manga_id)
    manga.update_column(:view_count, manga.view_count + 1)
  end

  # Các phương thức views_for_day, views_for_week, views_for_month đã được chuyển sang
  # model Manga để tối ưu hóa và tránh N+1 queries
end
