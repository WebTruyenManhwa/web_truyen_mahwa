class MangaService
  class << self
    # Lấy danh sách manga với các bộ lọc
    def fetch_mangas(params)
      # Chỉ select các trường cần thiết thay vì tất cả
      mangas = Manga.select(:id, :title, :description, :slug, :status, :author, :artist, :release_year, :view_count, :rating, :total_votes, :cover_image, :created_at, :updated_at)
                   .includes(:genres)

      mangas = mangas.where('title ILIKE ?', "%#{params[:search]}%") if params[:search].present?
      mangas = mangas.joins(:manga_genres).where(manga_genres: { genre_id: params[:genre_id] }) if params[:genre_id].present?

      case params[:sort]
      when 'popular'
        mangas = mangas.popular
      when 'recent'
        mangas = mangas.recent
      when 'alphabetical'
        mangas = mangas.alphabetical
      else
        mangas = mangas.recent
      end

      mangas
    end

    # Lấy thông tin chapter mới nhất cho danh sách manga - tối ưu để tránh N+1 query
    def get_latest_chapters(manga_ids)
      return {} if manga_ids.empty?

      # Đảm bảo manga_ids là mảng các số nguyên
      manga_ids = manga_ids.map(&:to_i).uniq

      latest_chapters = {}
      # Sử dụng DISTINCT ON để lấy chapter mới nhất cho mỗi manga trong một truy vấn duy nhất
      latest_chapters_sql = <<-SQL
        SELECT DISTINCT ON (manga_id) id, manga_id, number, title, slug, created_at
        FROM chapters
        WHERE manga_id IN (#{manga_ids.join(',')})
        ORDER BY manga_id, number::decimal DESC
      SQL

      # Thực thi truy vấn trực tiếp
      result = ActiveRecord::Base.connection.execute(latest_chapters_sql)

      # Xử lý kết quả
      result.each do |row|
        manga_id = row['manga_id'].to_i
        latest_chapters[manga_id] = {
          id: row['id'],
          number: row['number'],
          title: row['title'],
          slug: row['slug'],
          created_at: row['created_at']
        }
      end

      latest_chapters
    end

    # Lấy số lượng chapter cho danh sách manga - đã tối ưu để tránh N+1 query
    def get_chapters_count(manga_ids)
      return {} if manga_ids.empty?

      # Sử dụng GROUP BY để đếm số lượng chapter cho tất cả manga trong một truy vấn
      count_sql = "SELECT manga_id, COUNT(*) as count FROM chapters WHERE manga_id IN (#{manga_ids.join(',')}) GROUP BY manga_id"
      chapters_count = {}
      ActiveRecord::Base.connection.execute(count_sql).each do |row|
        chapters_count[row['manga_id']] = row['count']
      end

      chapters_count
    end

    # Lấy bảng xếp hạng manga theo thời gian - tối ưu để tránh N+1 query
    def get_rankings(period, limit = 20)
      # Lấy nhiều manga hơn để đảm bảo không bỏ sót manga có lượt xem cao
      # Lấy tối thiểu 100 manga hoặc gấp 5 lần limit yêu cầu
      fetch_limit = [100, limit * 5].max

      # Lấy tất cả manga với thông tin cần thiết
      mangas = Manga.select(:id, :title, :description, :status, :author, :artist, :release_year, :slug, :view_count, :rating, :total_votes, :cover_image, :created_at, :updated_at)
                   .includes(:genres)
                   .limit(fetch_limit)

      # Lấy danh sách manga IDs
      manga_ids = mangas.map(&:id)
      return [] if manga_ids.empty?

      # Lấy chapter mới nhất và số lượng chapter trong một truy vấn duy nhất cho mỗi loại
      latest_chapters = get_latest_chapters(manga_ids)
      chapters_count = get_chapters_count(manga_ids)

      # Preload chapters và images để tránh N+1 query
      chapters_by_manga = ChapterService.preload_chapters_for_mangas(manga_ids)

      # Lấy tất cả chapter IDs
      all_chapter_ids = chapters_by_manga.values.flatten.map(&:id)

      # Preload images cho tất cả chapter trong một truy vấn
      images_by_chapter = ChapterService.preload_images_for_chapters(all_chapter_ids)

      # Lấy lượt xem theo thời gian cho tất cả manga trong một truy vấn duy nhất
      period_views_data = get_period_views(manga_ids, period)

      # Tính lượt xem cho từng manga theo thời gian
      mangas_with_views = mangas.map do |manga|
        # Lấy lượt xem từ dữ liệu đã tính toán trước đó
        period_views = period_views_data[manga.id] || manga.view_count || 0

        # Sử dụng serializer để định dạng dữ liệu
        serializer = MangaRankingSerializer.new(manga, {
          period_views: period_views,
          latest_chapter: latest_chapters[manga.id],
          chapters_count: chapters_count[manga.id] || 0,
          chapters_by_manga: chapters_by_manga,
          images_by_chapter: images_by_chapter
        })

        # Chuyển đổi thành JSON
        manga_data = serializer.as_json
        manga_data['cover_image'] = { url: manga.cover_image_url } if manga.cover_image.present?

        # Không bao gồm chapters trong kết quả rankings để tránh lỗi serializer
        manga_data.delete('chapters')

        manga_data
      end

      # Sắp xếp theo lượt xem giảm dần, đảm bảo period_views không nil
      sorted_mangas = mangas_with_views.sort_by { |m| -(m[:period_views] || 0) }

      # Giới hạn lại số lượng manga trả về theo limit ban đầu
      sorted_mangas.take(limit)
    end

    # Lấy lượt xem theo thời gian cho nhiều manga cùng lúc
    def get_period_views(manga_ids, period)
      return {} if manga_ids.empty?

      # Xác định khoảng thời gian dựa trên period
      case period
      when :day
        start_date = Date.today.beginning_of_day
      when :week
        start_date = 6.days.ago.beginning_of_day
      when :month
        start_date = 29.days.ago.beginning_of_day
      else
        start_date = Date.today.beginning_of_day
      end

      # Cache key cho kết quả
      cache_key = "manga_views/#{period}/#{start_date.to_i}/#{manga_ids.sort.join('-')}"

      # Sử dụng cache để giảm tải database
      Rails.cache.fetch(cache_key, expires_in: 1.hour) do
        # Lấy tổng lượt xem cho tất cả manga trong khoảng thời gian
        views_data = {}

        # Truy vấn SQL để lấy tổng lượt xem cho mỗi manga trong khoảng thời gian
        # Sử dụng format chuỗi ISO 8601 cho thời gian để tránh lỗi
        formatted_date = start_date.strftime('%Y-%m-%d %H:%M:%S')
        sql = <<-SQL
          SELECT manga_id, SUM(view_count) as total_views
          FROM manga_views
          WHERE manga_id IN (#{manga_ids.join(',')})
            AND created_at >= '#{formatted_date}'
          GROUP BY manga_id
        SQL

        # Thực thi truy vấn và lưu kết quả
        ActiveRecord::Base.connection.execute(sql).each do |row|
          views_data[row['manga_id']] = row['total_views'].to_i
        end

        views_data
      end
    end

    # Tăng lượt xem cho manga
    def increment_view_count(manga, request_ip)
      # Tạo key duy nhất cho IP + manga
      visitor_identifier = request_ip
      manga_key = "view_count:manga_page:#{manga.id}:#{visitor_identifier}"

      # Sử dụng Rails.cache để giới hạn tốc độ
      manga_viewed = Rails.cache.exist?(manga_key)

      # Tăng lượt xem manga nếu IP này chưa xem gần đây
      unless manga_viewed
        # Theo dõi lượt xem trong database
        manga.track_view

        # Set cache hết hạn sau 30 phút
        Rails.cache.write(manga_key, true, expires_in: 30.minutes)
        Rails.logger.info "=== Incremented view count for manga page #{manga.id} (#{manga.title}) ==="

        # Xóa cache của manga để đảm bảo dữ liệu mới nhất được trả về
        cache_key = "mangas/show/#{manga.id}-#{manga.updated_at.to_i}-rating#{manga.rating}-votes#{manga.total_votes}"
        Rails.cache.delete(cache_key)
        Rails.logger.info "=== Deleted manga cache key: #{cache_key} ==="
      end
    end
  end
end
