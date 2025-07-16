class CacheService
  class << self
    # Tạo cache key từ params
    def params_cache_key(params)
      keys = []
      keys << "search=#{params[:search]}" if params[:search].present?
      keys << "genre=#{params[:genre_id]}" if params[:genre_id].present?
      keys << "sort=#{params[:sort]}" if params[:sort].present?
      keys << "page=#{params[:page] || 1}"
      keys << "per_page=#{params[:per_page] || 20}"
      keys.join('&')
    end

    # Tạo cache key cho manga show
    def manga_show_cache_key(manga)
      "mangas/show/#{manga.id}-#{manga.updated_at.to_i}-rating#{manga.rating}-votes#{manga.total_votes}"
    end

    # Tạo cache key cho bảng xếp hạng theo ngày
    def rankings_day_cache_key(limit)
      "rankings/day/#{limit}/#{Date.today.to_s}"
    end

    # Tạo cache key cho bảng xếp hạng theo tuần
    def rankings_week_cache_key(limit)
      "rankings/week/#{limit}/#{Date.today.beginning_of_week.to_s}"
    end

    # Tạo cache key cho bảng xếp hạng theo tháng
    def rankings_month_cache_key(limit)
      "rankings/month/#{limit}/#{Date.today.beginning_of_month.to_s}"
    end

    # Xóa cache khi cập nhật manga
    def clear_manga_cache(manga)
      cache_key = manga_show_cache_key(manga)
      Rails.cache.delete(cache_key)
      Rails.cache.delete("mangas/index/")
    end
  end
end
