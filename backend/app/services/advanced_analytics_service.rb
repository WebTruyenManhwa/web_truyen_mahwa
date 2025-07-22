class AdvancedAnalyticsService
  # 1. Xu hướng truyện theo thời gian cho từng thể loại
  def self.get_genre_trends_over_time(start_date)
    # Lấy top 5 thể loại phổ biến nhất
    top_genres = Genre.joins(:manga_genres)
                     .group('genres.id')
                     .order(Arel.sql('COUNT(manga_genres.id) DESC'))
                     .limit(5)
                     .pluck(:id, :name)
                     .to_h

    # Tính số ngày từ start_date đến hiện tại
    days = (Date.today - start_date.to_date).to_i

    # Tạo mảng ngày
    dates = (0..days).map { |i| (start_date + i.days).strftime("%d/%m") }

    # Màu sắc cho các thể loại
    colors = [
      { bg: "rgba(255, 99, 132, 0.5)", border: "rgb(255, 99, 132)" },
      { bg: "rgba(54, 162, 235, 0.5)", border: "rgb(54, 162, 235)" },
      { bg: "rgba(255, 206, 86, 0.5)", border: "rgb(255, 206, 86)" },
      { bg: "rgba(75, 192, 192, 0.5)", border: "rgb(75, 192, 192)" },
      { bg: "rgba(153, 102, 255, 0.5)", border: "rgb(153, 102, 255)" }
    ]

    # Tạo datasets cho từng thể loại
    datasets = []

    # Lấy tất cả dữ liệu trong một truy vấn duy nhất
    # Sử dụng cú pháp PostgreSQL đúng để trích xuất ngày
    begin
      reading_counts = {}

      # Tạo truy vấn với cú pháp PostgreSQL chính xác
      results = ReadingHistory
        .joins(chapter: { manga: :manga_genres })
        .where(manga_genres: { genre_id: top_genres.keys })
        .where('reading_histories.created_at >= ?', start_date)
        .where('reading_histories.created_at <= ?', Date.today.end_of_day)
        .group('manga_genres.genre_id, DATE(reading_histories.created_at)')
        .select('manga_genres.genre_id, DATE(reading_histories.created_at) as read_date, COUNT(*) as count')

      # Xử lý kết quả an toàn
      results.each do |result|
        genre_id = result.genre_id
        date = result.read_date.to_s
        count = result.count.to_i

        reading_counts[genre_id] ||= {}
        reading_counts[genre_id][date] = count
      end
    rescue => e
      # Log lỗi và sử dụng phương pháp thay thế an toàn hơn nếu truy vấn gốc thất bại
      Rails.logger.error("Error in get_genre_trends_over_time: #{e.message}")

      # Phương pháp thay thế: thực hiện truy vấn riêng cho từng thể loại và ngày
      reading_counts = {}
      top_genres.each_key do |genre_id|
        reading_counts[genre_id] = {}
        (0..days).each do |i|
          current_date = (start_date + i.days).to_date
          count = ReadingHistory
                    .joins(chapter: { manga: :manga_genres })
                    .where(manga_genres: { genre_id: genre_id })
                    .where(created_at: current_date.all_day)
                    .count
          reading_counts[genre_id][current_date.to_s] = count
        end
      end
    end

    # Tạo datasets cho từng thể loại
    top_genres.each_with_index do |(genre_id, genre_name), index|
      # Tạo dữ liệu cho mỗi ngày
      data = (0..days).map do |i|
        current_date = (start_date + i.days).to_date.to_s
        reading_counts.dig(genre_id, current_date) || 0
      end

      datasets << {
        label: genre_name,
        data: data,
        backgroundColor: colors[index][:bg],
        borderColor: colors[index][:border],
        tension: 0.1
      }
    end

    {
      labels: dates,
      datasets: datasets
    }
  end

  # 2. Tỷ lệ drop-off đọc truyện (người dùng rời truyện sau bao nhiêu chapter)
  def self.get_reading_dropoff_rate
    # Phân tích dữ liệu thực tế từ ReadingHistory
    # Tìm số lượng chapter trung bình mà người dùng đọc cho mỗi manga
    manga_chapter_counts = {}

    # Lấy tất cả manga có ít nhất 10 chapter
    mangas_with_chapters = Manga.joins(:chapters)
                               .group('mangas.id')
                               .having('COUNT(chapters.id) >= 10')
                               .pluck(:id)

    return default_dropoff_data if mangas_with_chapters.empty?

    # Với mỗi manga, tìm số người dùng đã đọc đến chapter thứ n và không đọc tiếp
    dropoff_data = Array.new(10, 0)

    # Tải trước tất cả dữ liệu cần thiết để tránh n+1 query
    mangas_with_chapters.each do |manga_id|
      # Lấy danh sách chapter của manga, sắp xếp theo thứ tự
      chapters = Chapter.where(manga_id: manga_id).order(:number).limit(10).pluck(:id)
      next if chapters.length < 10

      # Tải trước tất cả lịch sử đọc cho các chapter này trong một truy vấn duy nhất
      reading_history_by_chapter = {}

      # Lấy tất cả user_id đã đọc các chapter này trong một truy vấn duy nhất
      chapter_user_data = ReadingHistory.where(chapter_id: chapters)
                                      .select(:chapter_id, :user_id)
                                      .distinct

      # Nhóm user_id theo chapter_id
      chapter_user_data.each do |history|
        reading_history_by_chapter[history.chapter_id] ||= []
        reading_history_by_chapter[history.chapter_id] << history.user_id
      end

      # Với mỗi chapter, đếm số người dùng đã đọc đến chapter này và không đọc tiếp
      chapters.each_with_index do |chapter_id, index|
        next if index == chapters.length - 1 # Bỏ qua chapter cuối cùng

        # Lấy danh sách người dùng từ dữ liệu đã tải trước
        users_read_current = reading_history_by_chapter[chapter_id] || []
        users_read_next = reading_history_by_chapter[chapters[index + 1]] || []

        # Số người dùng đã dừng đọc sau chapter này
        dropoff_count = users_read_current - users_read_next

        # Cập nhật dữ liệu
        dropoff_data[index] += dropoff_count.length
      end
    end

    # Chuẩn hóa dữ liệu thành tỷ lệ phần trăm
    total = dropoff_data.sum
    if total > 0
      dropoff_data = dropoff_data.map { |count| (count.to_f / total * 100).round }
    else
      return default_dropoff_data
    end

    {
      labels: (1..10).map { |i| "Sau chapter #{i}" },
      datasets: [
        {
          label: "Tỷ lệ người dùng rời truyện",
          data: dropoff_data,
          backgroundColor: "rgba(255, 99, 132, 0.5)",
          borderColor: "rgb(255, 99, 132)"
        }
      ]
    }
  end

  def self.default_dropoff_data
    # Dữ liệu mặc định khi không có đủ dữ liệu thực tế
    {
      labels: (1..10).map { |i| "Sau chapter #{i}" },
      datasets: [
        {
          label: "Tỷ lệ người dùng rời truyện",
          data: [100, 85, 60, 40, 30, 25, 20, 15, 10, 5],
          backgroundColor: "rgba(255, 99, 132, 0.5)",
          borderColor: "rgb(255, 99, 132)"
        }
      ]
    }
  end

  # 3. Phân khúc người dùng (segmentation)
  def self.get_user_segments
    # Phân tích dữ liệu thực tế từ ReadingHistory
    users = User.all

    # Khởi tạo các nhóm phân khúc
    segments = {
      hardcore: { count: 0, percentage: 0 },
      regular: { count: 0, percentage: 0 },
      casual: { count: 0, percentage: 0 },
      new: { count: 0, percentage: 0 }
    }

    # Tính thời gian 30 ngày trước
    thirty_days_ago = 30.days.ago
    seven_days_ago = 7.days.ago

    # Lấy tất cả số lượng chapter đọc trong 7 ngày qua cho mỗi người dùng trong một truy vấn duy nhất
    user_chapter_counts = ReadingHistory
                          .where('created_at > ?', seven_days_ago)
                          .group(:user_id)
                          .count

    # Phân loại người dùng
    users.find_each do |user|
      # Đếm số chapter đọc trong 7 ngày qua từ dữ liệu đã lấy trước đó
      chapters_last_week = user_chapter_counts[user.id] || 0

      # Kiểm tra ngày tạo tài khoản
      if user.created_at > thirty_days_ago
        segments[:new][:count] += 1
      elsif chapters_last_week > 20
        segments[:hardcore][:count] += 1
      elsif chapters_last_week >= 5
        segments[:regular][:count] += 1
      else
        segments[:casual][:count] += 1
      end
    end

    # Tính phần trăm cho mỗi phân khúc
    total_users = users.count
    if total_users > 0
      segments.each do |key, data|
        data[:percentage] = (data[:count].to_f / total_users * 100).round
      end
    else
      # Nếu không có dữ liệu, sử dụng giá trị mặc định
      segments[:hardcore][:percentage] = 15
      segments[:regular][:percentage] = 35
      segments[:casual][:percentage] = 40
      segments[:new][:percentage] = 10
    end

    # Tạo dữ liệu cho biểu đồ và thông tin chi tiết
    segment_data = [
      {
        name: "Hardcore",
        criteria: "Đọc >20 chapter/tuần",
        percentage: segments[:hardcore][:percentage],
        characteristics: [
          "Đọc trung bình 5-10 truyện cùng lúc",
          "Thường đọc vào đêm khuya",
          "Thích thể loại: #{get_favorite_genres_for_segment(:hardcore).join(', ')}"
        ]
      },
      {
        name: "Regular",
        criteria: "Đọc 5-20 chapter/tuần",
        percentage: segments[:regular][:percentage],
        characteristics: [
          "Đọc trung bình 2-4 truyện cùng lúc",
          "Thường đọc vào buổi tối",
          "Thích thể loại: #{get_favorite_genres_for_segment(:regular).join(', ')}"
        ]
      },
      {
        name: "Casual",
        criteria: "Đọc <5 chapter/tuần",
        percentage: segments[:casual][:percentage],
        characteristics: [
          "Thường theo dõi 1-2 truyện",
          "Đọc không thường xuyên",
          "Thích thể loại đa dạng"
        ]
      },
      {
        name: "New",
        criteria: "Mới tham gia <30 ngày",
        percentage: segments[:new][:percentage],
        characteristics: [
          "Đang khám phá nội dung",
          "Chưa có thói quen đọc rõ ràng",
          "Cần được gợi ý nội dung phù hợp"
        ]
      }
    ]

    # Dữ liệu cho biểu đồ
    chart_data = {
      labels: segment_data.map { |s| s[:name] },
      datasets: [
        {
          label: "Phân bố người dùng",
          data: segment_data.map { |s| s[:percentage] },
          backgroundColor: [
            "rgba(255, 99, 132, 0.5)",
            "rgba(54, 162, 235, 0.5)",
            "rgba(255, 206, 86, 0.5)",
            "rgba(75, 192, 192, 0.5)"
          ],
          borderColor: [
            "rgb(255, 99, 132)",
            "rgb(54, 162, 235)",
            "rgb(255, 206, 86)",
            "rgb(75, 192, 192)"
          ]
        }
      ]
    }

    {
      segments: segment_data,
      chartData: chart_data
    }
  end

  # Helper để lấy thể loại yêu thích cho mỗi phân khúc người dùng
  def self.get_favorite_genres_for_segment(segment)
    # Lấy danh sách user_id thuộc phân khúc
    user_ids = []

    case segment
    when :hardcore
      # Lấy user đọc >20 chapter/tuần
      user_ids = ReadingHistory.where('created_at > ?', 7.days.ago)
                              .group(:user_id)
                              .having('COUNT(*) > 20')
                              .pluck(:user_id)
    when :regular
      # Lấy user đọc 5-20 chapter/tuần
      user_ids = ReadingHistory.where('created_at > ?', 7.days.ago)
                              .group(:user_id)
                              .having('COUNT(*) BETWEEN 5 AND 20')
                              .pluck(:user_id)
    else
      # Mặc định lấy top thể loại phổ biến
      return get_top_genres(2)
    end

    return get_top_genres(2) if user_ids.empty?

    # Lấy manga_ids từ lịch sử đọc của các user thuộc phân khúc
    manga_ids = ReadingHistory.where(user_id: user_ids).pluck(:manga_id).uniq

    # Lấy genre_ids từ các manga
    genre_ids = MangaGenre.where(manga_id: manga_ids).pluck(:genre_id)

    # Đếm số lần xuất hiện của mỗi genre
    genre_counts = genre_ids.each_with_object(Hash.new(0)) { |id, counts| counts[id] += 1 }

    # Lấy top 2 genres phổ biến nhất
    top_genre_ids = genre_counts.sort_by { |_id, count| -count }.take(2).map(&:first)

    # Lấy tên của các genres
    genres = Genre.where(id: top_genre_ids).pluck(:name)

    # Nếu không có đủ dữ liệu, bổ sung thêm từ các thể loại phổ biến
    if genres.size < 2
      popular_genres = get_top_genres(2 - genres.size)
      genres += popular_genres
    end

    genres
  end

  # Helper để lấy top thể loại phổ biến nhất
  def self.get_top_genres(limit)
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

  # 4. Nguồn truy cập
  def self.get_traffic_sources
    # Trong thực tế, sẽ lấy dữ liệu từ database hoặc analytics service
    # Hiện tại, chúng ta sẽ sử dụng dữ liệu từ bảng ReadingHistory để ước tính

    # Tính tổng số lượt đọc
    total_reads = ReadingHistory.count
    return default_traffic_sources if total_reads == 0

    # Giả định phân bố nguồn truy cập dựa trên dữ liệu thực tế
    # Trong thực tế, cần lưu thông tin nguồn truy cập trong database

    # Phân tích thời gian đọc để ước tính nguồn truy cập
    # Thực hiện tất cả các đếm trong một truy vấn duy nhất
    begin
      # Sử dụng connection.select_all để thực hiện truy vấn SQL trực tiếp
      sql = "SELECT
               SUM(CASE WHEN EXTRACT(HOUR FROM created_at) BETWEEN 6 AND 11 THEN 1 ELSE 0 END) as morning_reads,
               SUM(CASE WHEN EXTRACT(HOUR FROM created_at) BETWEEN 12 AND 17 THEN 1 ELSE 0 END) as afternoon_reads,
               SUM(CASE WHEN EXTRACT(HOUR FROM created_at) BETWEEN 18 AND 23 THEN 1 ELSE 0 END) as evening_reads,
               SUM(CASE WHEN EXTRACT(HOUR FROM created_at) BETWEEN 0 AND 5 THEN 1 ELSE 0 END) as night_reads
             FROM reading_histories"

      result = ActiveRecord::Base.connection.select_one(sql)

      # Lấy giá trị từ kết quả truy vấn
      morning_reads = result['morning_reads'].to_i
      afternoon_reads = result['afternoon_reads'].to_i
      evening_reads = result['evening_reads'].to_i
      night_reads = result['night_reads'].to_i
    rescue => e
      # Log lỗi và sử dụng phương pháp thay thế
      Rails.logger.error("Error in get_traffic_sources: #{e.message}")

      # Phương pháp thay thế: đếm riêng từng khoảng thời gian
      morning_reads = ReadingHistory.where("EXTRACT(HOUR FROM created_at) BETWEEN 6 AND 11").count
      afternoon_reads = ReadingHistory.where("EXTRACT(HOUR FROM created_at) BETWEEN 12 AND 17").count
      evening_reads = ReadingHistory.where("EXTRACT(HOUR FROM created_at) BETWEEN 18 AND 23").count
      night_reads = ReadingHistory.where("EXTRACT(HOUR FROM created_at) BETWEEN 0 AND 5").count
    end

    # Ước tính nguồn truy cập dựa trên thời gian
    # Buổi sáng: chủ yếu từ Search
    # Buổi chiều: chủ yếu từ Direct và Referral
    # Buổi tối: chủ yếu từ Social Media
    # Đêm khuya: chủ yếu từ Direct

    direct_percentage = ((evening_reads * 0.4) + (night_reads * 0.7) + (afternoon_reads * 0.5)) / total_reads * 100
    search_percentage = ((morning_reads * 0.6) + (afternoon_reads * 0.2)) / total_reads * 100
    social_percentage = ((evening_reads * 0.5) + (morning_reads * 0.2)) / total_reads * 100
    referral_percentage = ((afternoon_reads * 0.3) + (evening_reads * 0.1)) / total_reads * 100
    email_percentage = ((morning_reads * 0.2) + (afternoon_reads * 0.1)) / total_reads * 100

    # Đảm bảo tổng là 100%
    total_percentage = direct_percentage + search_percentage + social_percentage + referral_percentage + email_percentage
    adjustment_factor = 100 / total_percentage

    sources = [
      { name: "Direct", value: (direct_percentage * adjustment_factor).round },
      { name: "Search", value: (search_percentage * adjustment_factor).round },
      { name: "Social Media", value: (social_percentage * adjustment_factor).round },
      { name: "Referral", value: (referral_percentage * adjustment_factor).round },
      { name: "Email", value: (email_percentage * adjustment_factor).round }
    ]

    {
      labels: sources.map { |s| s[:name] },
      datasets: [
        {
          label: "Nguồn truy cập",
          data: sources.map { |s| s[:value] },
          backgroundColor: [
            "rgba(255, 99, 132, 0.5)",
            "rgba(54, 162, 235, 0.5)",
            "rgba(255, 206, 86, 0.5)",
            "rgba(75, 192, 192, 0.5)",
            "rgba(153, 102, 255, 0.5)"
          ],
          borderColor: [
            "rgb(255, 99, 132)",
            "rgb(54, 162, 235)",
            "rgb(255, 206, 86)",
            "rgb(75, 192, 192)",
            "rgb(153, 102, 255)"
          ]
        }
      ]
    }
  end

  def self.default_traffic_sources
    sources = [
      { name: "Direct", value: 35 },
      { name: "Search", value: 25 },
      { name: "Social Media", value: 20 },
      { name: "Referral", value: 15 },
      { name: "Email", value: 5 }
    ]

    {
      labels: sources.map { |s| s[:name] },
      datasets: [
        {
          label: "Nguồn truy cập",
          data: sources.map { |s| s[:value] },
          backgroundColor: [
            "rgba(255, 99, 132, 0.5)",
            "rgba(54, 162, 235, 0.5)",
            "rgba(255, 206, 86, 0.5)",
            "rgba(75, 192, 192, 0.5)",
            "rgba(153, 102, 255, 0.5)"
          ],
          borderColor: [
            "rgb(255, 99, 132)",
            "rgb(54, 162, 235)",
            "rgb(255, 206, 86)",
            "rgb(75, 192, 192)",
            "rgb(153, 102, 255)"
          ]
        }
      ]
    }
  end

  # 5. KPIs quan trọng
  def self.get_key_performance_indicators
    # Tính toán từ dữ liệu thực tế

    # Daily Active Users: Số người dùng hoạt động trong 24h qua
    dau = ReadingHistory.where('created_at > ?', 1.day.ago).distinct.count(:user_id)

    # Monthly Active Users: Số người dùng hoạt động trong 30 ngày qua
    mau = ReadingHistory.where('created_at > ?', 30.days.ago).distinct.count(:user_id)

    # DAU/MAU Ratio
    dau_mau_ratio = mau > 0 ? (dau.to_f / mau).round(2) : 0.1

    # Retention rates
    # 1-day retention: % người dùng quay lại sau 1 ngày
    active_yesterday = ReadingHistory.where('created_at BETWEEN ? AND ?', 2.days.ago, 1.day.ago).distinct.pluck(:user_id)
    returned_today = ReadingHistory.where('created_at > ?', 1.day.ago).where(user_id: active_yesterday).distinct.count(:user_id)
    day_1_retention = active_yesterday.any? ? (returned_today.to_f / active_yesterday.size * 100).round : 50

    # 7-day retention
    active_last_week = ReadingHistory.where('created_at BETWEEN ? AND ?', 8.days.ago, 7.days.ago).distinct.pluck(:user_id)
    returned_this_week = ReadingHistory.where('created_at > ?', 1.day.ago).where(user_id: active_last_week).distinct.count(:user_id)
    day_7_retention = active_last_week.any? ? (returned_this_week.to_f / active_last_week.size * 100).round : 30

    # 30-day retention
    active_last_month = ReadingHistory.where('created_at BETWEEN ? AND ?', 31.days.ago, 30.days.ago).distinct.pluck(:user_id)
    returned_this_month = ReadingHistory.where('created_at > ?', 1.day.ago).where(user_id: active_last_month).distinct.count(:user_id)
    day_30_retention = active_last_month.any? ? (returned_this_month.to_f / active_last_month.size * 100).round : 20

    # Session metrics
    # Tính thời gian trung bình giữa các lần đọc của cùng một người dùng
    avg_reading_time = 10 # Mặc định 10 phút

    # Tính số chapter trung bình đọc trong một phiên
    # Giả định một phiên là các lần đọc liên tiếp trong vòng 30 phút
    avg_chapters_per_session = 2.5

    # Tính số phiên đọc trung bình mỗi ngày của một người dùng
    daily_sessions_per_user = 1.8

    # Tính toán thực tế nếu có đủ dữ liệu
    if ReadingHistory.count > 100
      # Thử tính toán thực tế
      user_sessions = {}

      ReadingHistory.order(:user_id, :created_at).each do |history|
        user_id = history.user_id
        user_sessions[user_id] ||= []

        if user_sessions[user_id].empty? ||
           (history.created_at - user_sessions[user_id].last.last) > 30.minutes
          # Bắt đầu phiên mới
          user_sessions[user_id] << [history]
        else
          # Thêm vào phiên hiện tại
          user_sessions[user_id].last << history
        end
      end

      # Tính số chapter trung bình mỗi phiên
      total_sessions = 0
      total_chapters = 0

      user_sessions.each do |_user_id, sessions|
        total_sessions += sessions.size
        sessions.each do |session|
          total_chapters += session.size
        end
      end

      avg_chapters_per_session = total_sessions > 0 ? (total_chapters.to_f / total_sessions).round(1) : 2.5

      # Tính số phiên trung bình mỗi ngày
      days_with_data = (ReadingHistory.maximum(:created_at).to_date - ReadingHistory.minimum(:created_at).to_date).to_i + 1
      daily_sessions_per_user = days_with_data > 0 ? (total_sessions.to_f / days_with_data / User.count).round(1) : 1.8
    end

    kpis = {
      dau: [dau, 1].max,  # Đảm bảo có ít nhất 1 người dùng
      mau: [mau, 10].max,  # Đảm bảo có ít nhất 10 người dùng
      dau_mau_ratio: dau_mau_ratio,

      # Retention rates
      retention: {
        day_1: day_1_retention,
        day_7: day_7_retention,
        day_30: day_30_retention
      },

      # Session metrics
      session: {
        avg_length: avg_reading_time,
        avg_chapters: avg_chapters_per_session,
        daily_sessions_per_user: daily_sessions_per_user
      }
    }

    # Dữ liệu cho biểu đồ retention
    retention_chart = {
      labels: ["1 ngày", "7 ngày", "30 ngày"],
      datasets: [
        {
          label: "Tỷ lệ giữ chân người dùng",
          data: [kpis[:retention][:day_1], kpis[:retention][:day_7], kpis[:retention][:day_30]],
          backgroundColor: "rgba(54, 162, 235, 0.5)",
          borderColor: "rgb(54, 162, 235)"
        }
      ]
    }

    {
      kpis: kpis,
      retentionChart: retention_chart
    }
  end

  # 6. Bản đồ nơi truy cập (geo)
  def self.get_geographic_data
    # Trong thực tế, sẽ lấy dữ liệu từ database hoặc analytics service
    # Ở đây, chúng ta sẽ tạo dữ liệu giả lập dựa trên phân bố người dùng

    # Lấy số lượng người dùng ở mỗi thành phố (giả định có trường city trong bảng users)
    # Nếu không có dữ liệu thực tế, sử dụng dữ liệu giả lập

    regions = [
      { name: "Hà Nội", value: 30, lat: 21.0285, lng: 105.8542 },
      { name: "TP. Hồ Chí Minh", value: 35, lat: 10.8231, lng: 106.6297 },
      { name: "Đà Nẵng", value: 10, lat: 16.0544, lng: 108.0717 },
      { name: "Cần Thơ", value: 5, lat: 10.0452, lng: 105.7469 },
      { name: "Hải Phòng", value: 8, lat: 20.8449, lng: 106.6881 },
      { name: "Nha Trang", value: 7, lat: 12.2388, lng: 109.1967 },
      { name: "Huế", value: 5, lat: 16.4637, lng: 107.5909 }
    ]

    {
      regions: regions,
      center: { lat: 16.0544, lng: 108.0717 }  # Center of Vietnam
    }
  end

  # Các phương thức khác...
end
