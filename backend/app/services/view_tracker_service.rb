class ViewTrackerService
  # Singleton để truy cập từ bất kỳ đâu
  include Singleton

  def initialize
    @redis = Redis.new(url: ENV.fetch('REDIS_URL', 'redis://localhost:6379/0'))
  end

  # Theo dõi lượt xem cho manga theo ngày
  def track_manga_view(manga_id)
    today = Date.today.to_s

    # Tăng lượt xem cho ngày hiện tại
    @redis.incr("views:manga:#{manga_id}:#{today}")

    # Tăng tổng lượt xem của manga
    @redis.incr("views:manga:#{manga_id}:total")
  end

  # Lấy lượt xem của manga trong ngày
  def get_manga_views_for_day(manga_id, date = Date.today)
    date_str = date.to_s
    views = @redis.get("views:manga:#{manga_id}:#{date_str}")
    views ? views.to_i : 0
  end

  # Lấy lượt xem của manga trong tuần
  def get_manga_views_for_week(manga_id)
    today = Date.today
    (0..6).sum do |i|
      date = today - i
      get_manga_views_for_day(manga_id, date)
    end
  end

  # Lấy lượt xem của manga trong tháng
  def get_manga_views_for_month(manga_id)
    today = Date.today
    (0..29).sum do |i|
      date = today - i
      get_manga_views_for_day(manga_id, date)
    end
  end

  # Lấy tổng lượt xem của manga
  def get_manga_total_views(manga_id)
    views = @redis.get("views:manga:#{manga_id}:total")
    views ? views.to_i : 0
  end

  # Đồng bộ tổng lượt xem từ Redis vào database
  def sync_views_to_database
    Manga.find_each do |manga|
      total_views = get_manga_total_views(manga.id)
      manga.update_column(:view_count, total_views) if total_views > 0
    end
  end
end
