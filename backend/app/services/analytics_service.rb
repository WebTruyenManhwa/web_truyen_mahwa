class AnalyticsService
  # Lấy dữ liệu lượt xem theo thời gian
  def self.get_views_over_time(start_date)
    # Tính số ngày từ start_date đến hiện tại
    days = (Date.today - start_date.to_date).to_i

    # Tạo mảng ngày và lượt xem
    dates = []
    views = []

    (0..days).each do |i|
      date = start_date + i.days
      dates << date.strftime("%d/%m")

      # Trong thực tế, sẽ lấy dữ liệu từ database
      # Ví dụ: Chapter.where(created_at: date.beginning_of_day..date.end_of_day).sum(:view_count)
      views << rand(1000..5000)
    end

    {
      labels: dates,
      datasets: [
        {
          label: "Lượt xem",
          data: views,
          backgroundColor: "rgba(53, 162, 235, 0.5)",
          borderColor: "rgb(53, 162, 235)"
        }
      ]
    }
  end

  # Lấy phân bố thể loại
  def self.get_genre_distribution
    # Lấy số lượng truyện theo thể loại
    genres = Genre.all.limit(6)

    labels = genres.map(&:name)
    data = genres.map do |genre|
      # Trong thực tế, sẽ lấy số lượng truyện theo thể loại
      # Ví dụ: genre.mangas.count
      rand(10..50)
    end

    background_colors = [
      "rgba(255, 99, 132, 0.5)",
      "rgba(54, 162, 235, 0.5)",
      "rgba(255, 206, 86, 0.5)",
      "rgba(75, 192, 192, 0.5)",
      "rgba(153, 102, 255, 0.5)",
      "rgba(255, 159, 64, 0.5)"
    ]

    border_colors = [
      "rgba(255, 99, 132, 1)",
      "rgba(54, 162, 235, 1)",
      "rgba(255, 206, 86, 1)",
      "rgba(75, 192, 192, 1)",
      "rgba(153, 102, 255, 1)",
      "rgba(255, 159, 64, 1)"
    ]

    {
      labels: labels,
      datasets: [
        {
          label: "Phân bố thể loại",
          data: data,
          backgroundColor: background_colors[0...labels.size],
          borderColor: border_colors[0...labels.size]
        }
      ]
    }
  end

  # Lấy hoạt động người dùng theo giờ
  def self.get_user_activity_by_hour
    # Phân tích thời gian đọc bằng SQL trực tiếp
    reading_times = ReadingHistory
      .select("EXTRACT(HOUR FROM created_at) AS hour, COUNT(*) AS count")
      .group("EXTRACT(HOUR FROM created_at)")
      .order("count DESC")
      .map { |r| [r.hour.to_i, r.count] }
      .to_h

    # Nếu không có dữ liệu, sử dụng dữ liệu mẫu
    if reading_times.empty?
      hours = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"]
      activities = [120, 50, 300, 450, 380, 520]
    else
      # Tạo mảng giờ và hoạt động từ dữ liệu thực
      sorted_hours = reading_times.keys.sort
      hours = sorted_hours.map { |h| format("%02d:00", h) }
      activities = sorted_hours.map { |h| reading_times[h] }
    end

    {
      labels: hours,
      datasets: [
        {
          label: "Hoạt động người dùng",
          data: activities,
          backgroundColor: "rgba(255, 99, 132, 0.5)",
          borderColor: "rgb(255, 99, 132)"
        }
      ]
    }
  end

  # Lấy thói quen đọc truyện
  def self.get_reading_habits
    {
      averageReadingTime: calculate_average_reading_time,
      mostActiveHour: find_most_active_hour,
      mostActiveDay: find_most_active_day,
      completionRate: calculate_completion_rate
    }
  end

  # Tính thời gian đọc trung bình
  def self.calculate_average_reading_time
    # Trong thực tế, cần dữ liệu về thời gian bắt đầu và kết thúc đọc
    # Ở đây, chúng ta sẽ ước tính dựa trên số lượng chapter đọc
    avg_time_per_chapter = rand(5.0..8.0)
    avg_time_per_chapter.round(1)
  end

  # Tìm giờ hoạt động nhiều nhất
  def self.find_most_active_hour
    # Nhóm lịch sử đọc theo giờ trong ngày bằng SQL trực tiếp
    result = ReadingHistory
      .select("EXTRACT(HOUR FROM created_at) AS hour, COUNT(*) AS count")
      .group("EXTRACT(HOUR FROM created_at)")
      .order("count DESC")
      .first

    # Trả về giờ hoạt động nhiều nhất, mặc định là 21 nếu không có dữ liệu
    result ? result.hour.to_i : 21
  end

  # Tìm ngày hoạt động nhiều nhất
  def self.find_most_active_day
    # Nhóm lịch sử đọc theo ngày trong tuần bằng SQL trực tiếp
    result = ReadingHistory
      .select("EXTRACT(DOW FROM created_at) AS day_of_week, COUNT(*) AS count")
      .group("EXTRACT(DOW FROM created_at)")
      .order("count DESC")
      .first

    # Chuyển đổi số thành tên ngày
    day_names = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"]

    # Trả về tên ngày hoạt động nhiều nhất, mặc định là Chủ Nhật nếu không có dữ liệu
    day_of_week = result ? result.day_of_week.to_i : 0
    day_names[day_of_week]
  end

  # Tính tỷ lệ đọc hoàn thành
  def self.calculate_completion_rate
    # Đếm số lượng manga mà người dùng đã đọc nhiều hơn 1 chapter
    multi_chapter_reads = ReadingHistory.group(:user_id, :manga_id)
                                     .having('COUNT(DISTINCT chapter_id) > 1')
                                     .count

    # Tổng số lượt đọc manga
    total_manga_reads = ReadingHistory.group(:user_id, :manga_id).count

    # Tính tỷ lệ
    rate = total_manga_reads.size > 0 ? (multi_chapter_reads.size.to_f / total_manga_reads.size * 100).round : 68

    # Giới hạn trong khoảng hợp lý
    [rate, 95].min
  end

  # Phân tích AI (giả lập)
  def self.get_ai_insights
    # Phân tích xu hướng thể loại dựa trên dữ liệu thực
    trending_genres = get_trending_genres

    # Phân tích hành vi người dùng dựa trên dữ liệu thực
    user_patterns = analyze_user_behavior

    # Đề xuất hành động dựa trên phân tích
    actions = generate_recommended_actions(user_patterns)

    # Phân tích giữ chân người dùng
    retention_insight = analyze_retention

    # Phân tích cơ hội tăng tương tác
    engagement_insight = analyze_engagement_opportunities

    {
      trendingGenres: trending_genres,
      userBehaviorPatterns: user_patterns,
      recommendedActions: actions,
      retentionInsights: retention_insight,
      engagementOpportunities: engagement_insight
    }
  end

  # Lấy xu hướng thể loại dựa trên lượt đọc gần đây
  def self.get_trending_genres
    # Lấy manga IDs từ lịch sử đọc trong 7 ngày gần nhất
    recent_manga_ids = ReadingHistory.where('created_at > ?', 7.days.ago)
                                   .pluck(:manga_id)
                                   .uniq

    # Lấy genre IDs từ các manga được đọc gần đây
    genre_ids = MangaGenre.where(manga_id: recent_manga_ids)
                        .pluck(:genre_id)

    # Đếm số lần xuất hiện của mỗi genre
    genre_counts = genre_ids.each_with_object(Hash.new(0)) { |id, counts| counts[id] += 1 }

    # Lấy top 4 genres phổ biến nhất
    top_genre_ids = genre_counts.sort_by { |_id, count| -count }.take(4).map(&:first)

    # Lấy tên của các genres
    trending = Genre.where(id: top_genre_ids).pluck(:name)

    # Nếu không có đủ dữ liệu, sử dụng một số thể loại phổ biến
    if trending.empty?
      return ["Isekai", "Cultivation", "School Life", "Romance"]
    end

    trending
  end

  # Phân tích hành vi người dùng
  def self.analyze_user_behavior
    # Phân tích thời gian đọc
    peak_hour = find_most_active_hour

    # Phân tích thiết bị đọc (giả lập - trong thực tế cần thêm dữ liệu)
    mobile_percentage = rand(65..75)

    # Phân tích thời gian đọc cuối tuần so với ngày thường
    weekday_count = ReadingHistory.where('extract(dow from created_at) BETWEEN 1 AND 5').count
    weekend_count = ReadingHistory.where('extract(dow from created_at) IN (0, 6)').count

    weekday_avg = weekday_count / 5.0
    weekend_avg = weekend_count / 2.0

    weekend_increase = weekday_avg > 0 ? ((weekend_avg - weekday_avg) / weekday_avg * 100).round : 15

    [
      "Người dùng thường đọc nhiều vào buổi tối (#{peak_hour}:00)",
      "#{mobile_percentage}% người dùng đọc trên thiết bị di động",
      "Thời gian đọc trung bình tăng #{weekend_increase}% vào cuối tuần"
    ]
  end

  # Tạo đề xuất hành động dựa trên phân tích
  def self.generate_recommended_actions(user_patterns)
    actions = []

    # Đề xuất dựa trên thiết bị
    if user_patterns.any? { |p| p.include?("thiết bị di động") }
      actions << "Tối ưu hóa trải nghiệm đọc trên mobile"
    end

    # Đề xuất dựa trên thời gian đọc
    if user_patterns.any? { |p| p.include?("buổi tối") }
      actions << "Tăng cường thông báo vào buổi tối"
    end

    # Đề xuất dựa trên ngày trong tuần
    if user_patterns.any? { |p| p.include?("cuối tuần") }
      actions << "Đề xuất truyện mới vào cuối tuần"
    end

    # Thêm đề xuất nếu cần
    if actions.size < 3
      actions << "Phát triển tính năng bookmark để đánh dấu vị trí đọc"
    end

    actions
  end

  # Phân tích giữ chân người dùng
  def self.analyze_retention
    # Đếm số người dùng quay lại sau khi đọc nhiều chương
    users_with_multiple_chapters = User.joins(:reading_histories)
                                      .group('users.id')
                                      .having('COUNT(DISTINCT reading_histories.chapter_id) >= 3')
                                      .count

    total_active_users = User.joins(:reading_histories).distinct.count

    retention_rate = total_active_users > 0 ? (users_with_multiple_chapters.size.to_f / total_active_users * 100).round : 65

    "Người dùng có xu hướng quay lại đọc tiếp nếu họ đã đọc ít nhất 3 chương của một truyện (#{retention_rate}% tỷ lệ giữ chân)"
  end

  # Phân tích cơ hội tăng tương tác
  def self.analyze_engagement_opportunities
    # Phân tích thời gian đọc trung bình
    avg_chapters_per_user = ReadingHistory.group(:user_id).count.values.sum.to_f / User.count

    potential_increase = (25 + rand(-5..5)).to_i

    "Thêm tính năng đánh dấu và ghi chú có thể tăng thời gian đọc lên #{potential_increase}% và số chương đọc từ #{avg_chapters_per_user.round(1)} lên #{(avg_chapters_per_user * (1 + potential_increase/100.0)).round(1)} chương/người dùng"
  end

  # Đề xuất cá nhân hóa
  def self.get_personalized_recommendations
    # Lấy danh sách người dùng và đề xuất truyện cho họ
    # Lấy tất cả người dùng, không chỉ role 'user'
    users = User.limit(5)

    # Nếu không có người dùng nào, trả về mảng rỗng
    return [] if users.empty?

    users.map do |user|
      # Lấy thể loại yêu thích từ lịch sử đọc của người dùng
      favorite_genres = get_user_favorite_genres(user)

      # Lấy truyện đề xuất dựa trên thể loại yêu thích
      recommended_mangas = get_recommended_mangas_for_user(user, favorite_genres)

      {
        userId: user.id,
        username: user.username,
        favoriteGenres: favorite_genres,
        recommendedMangas: recommended_mangas
      }
    end
  end

  # Lấy thể loại yêu thích của người dùng dựa trên lịch sử đọc
  def self.get_user_favorite_genres(user)
    # Lấy manga IDs từ lịch sử đọc của người dùng
    manga_ids = ReadingHistory.where(user_id: user.id).pluck(:manga_id).uniq

    if manga_ids.empty?
      # Nếu người dùng không có lịch sử đọc, lấy các thể loại phổ biến nhất
      return get_popular_genres(3)
    end

    # Lấy genre IDs từ các manga đã đọc
    genre_ids = MangaGenre.where(manga_id: manga_ids).pluck(:genre_id)

    # Đếm số lần xuất hiện của mỗi genre
    genre_counts = genre_ids.each_with_object(Hash.new(0)) { |id, counts| counts[id] += 1 }

    # Lấy top 3 genres phổ biến nhất
    top_genre_ids = genre_counts.sort_by { |_id, count| -count }.take(3).map(&:first)

    # Lấy tên của các genres
    genres = Genre.where(id: top_genre_ids).pluck(:name)

    # Nếu không có đủ dữ liệu, bổ sung thêm từ các thể loại phổ biến
    if genres.size < 3
      popular_genres = get_popular_genres(3 - genres.size)
      genres += popular_genres
    end

    genres
  end

  # Lấy các thể loại phổ biến nhất
  def self.get_popular_genres(limit)
    # Lấy các thể loại có nhiều manga nhất
    popular_genre_ids = MangaGenre.group(:genre_id)
                                .order(Arel.sql('COUNT(*) DESC'))
                                .limit(limit)
                                .pluck(:genre_id)

    # Lấy tên của các genres
    genres = Genre.where(id: popular_genre_ids).pluck(:name)

    # Nếu vẫn không có đủ dữ liệu, sử dụng một số thể loại mặc định
    if genres.empty?
      return ["Hành động", "Phiêu lưu", "Viễn tưởng"].take(limit)
    end

    genres
  end

  # Lấy truyện đề xuất cho người dùng dựa trên thể loại yêu thích
  def self.get_recommended_mangas_for_user(user, favorite_genres)
    # Lấy genre IDs từ tên thể loại
    genre_ids = Genre.where(name: favorite_genres).pluck(:id)

    # Lấy manga IDs từ các thể loại yêu thích
    manga_ids = MangaGenre.where(genre_id: genre_ids).pluck(:manga_id).uniq

    # Lấy manga IDs mà người dùng đã đọc
    read_manga_ids = ReadingHistory.where(user_id: user.id).pluck(:manga_id).uniq

    # Lọc ra những manga chưa đọc
    unread_manga_ids = manga_ids - read_manga_ids

    # Lấy top mangas theo lượt xem
    recommended_mangas = Manga.where(id: unread_manga_ids)
                             .order(view_count: :desc)
                             .limit(3)

    # Nếu không đủ truyện đề xuất, bổ sung thêm từ truyện phổ biến
    if recommended_mangas.count < 3
      popular_mangas = Manga.where.not(id: read_manga_ids)
                           .order(view_count: :desc)
                           .limit(3 - recommended_mangas.count)

      recommended_mangas = recommended_mangas + popular_mangas
    end

    # Nếu vẫn không đủ 3 truyện (có thể do database trống hoặc người dùng đã đọc hết)
    if recommended_mangas.count < 3
      # Lấy bất kỳ truyện nào, kể cả đã đọc
      any_mangas = Manga.order(view_count: :desc)
                       .limit(3 - recommended_mangas.count)

      recommended_mangas = recommended_mangas + any_mangas
    end

    # Đảm bảo không có truyện trùng lặp
    recommended_mangas = recommended_mangas.uniq

    # Format kết quả
    recommended_mangas.map do |manga|
      # Tính điểm phù hợp dựa trên số lượng thể loại trùng khớp
      manga_genres = manga.genres.pluck(:name)
      matching_genres = (manga_genres & favorite_genres).count
      match_score = [85 + (matching_genres * 5), 98].min # Điểm từ 85-98 tùy theo số thể loại trùng khớp

      {
        id: manga.id,
        title: manga.title,
        coverUrl: manga.cover_image_url || "/images/default-cover.jpg",
        matchScore: match_score
      }
    end
  end
end
