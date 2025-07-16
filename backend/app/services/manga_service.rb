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

    # Lấy thông tin chapter mới nhất cho danh sách manga
    def get_latest_chapters(manga_ids)
      return {} if manga_ids.empty?

      latest_chapters = {}
      # Sử dụng subquery để lấy chapter mới nhất cho mỗi manga
      latest_chapters_sql = <<-SQL
        WITH ranked_chapters AS (
          SELECT
            id,
            manga_id,
            number,
            created_at,
            ROW_NUMBER() OVER (PARTITION BY manga_id ORDER BY number::decimal DESC) as rn
          FROM chapters
          WHERE manga_id IN (#{manga_ids.join(',')})
        )
        SELECT id, manga_id, number, created_at
        FROM ranked_chapters
        WHERE rn = 1
      SQL

      # Thực thi truy vấn trực tiếp
      result = ActiveRecord::Base.connection.execute(latest_chapters_sql)

      # Xử lý kết quả
      result.each do |row|
        latest_chapters[row['manga_id']] = {
          id: row['id'],
          number: row['number'],
          created_at: row['created_at']
        }
      end

      latest_chapters
    end

    # Lấy số lượng chapter cho danh sách manga
    def get_chapters_count(manga_ids)
      return {} if manga_ids.empty?

      chapters_count = {}
      count_sql = "SELECT manga_id, COUNT(*) as count FROM chapters WHERE manga_id IN (#{manga_ids.join(',')}) GROUP BY manga_id"
      ActiveRecord::Base.connection.execute(count_sql).each do |row|
        chapters_count[row['manga_id']] = row['count']
      end

      chapters_count
    end

    # Lấy bảng xếp hạng manga theo thời gian
    def get_rankings(period, limit = 20)
      # Lấy tất cả manga với thông tin cần thiết, giới hạn số lượng
      mangas = Manga.select(:id, :title, :description, :status, :author, :artist, :release_year, :slug, :view_count, :rating, :total_votes, :cover_image, :created_at, :updated_at)
                   .includes(:genres)
                   .limit(limit)

      # Lấy danh sách manga IDs
      manga_ids = mangas.map(&:id)

      # Lấy chapter mới nhất và số lượng chapter
      latest_chapters = get_latest_chapters(manga_ids)
      chapters_count = get_chapters_count(manga_ids)

      # Tính lượt xem cho từng manga theo thời gian
      mangas_with_views = mangas.map do |manga|
        # Lấy lượt xem theo thời gian từ database
        period_views = case period
                      when :day
                        manga.views_for_day
                      when :week
                        manga.views_for_week
                      when :month
                        manga.views_for_month
                      end

        # Nếu không có lượt xem hoặc nil, sử dụng view_count từ manga hoặc 0
        period_views = manga.view_count || 0 if period_views.nil? || period_views == 0

        # Sử dụng serializer để định dạng dữ liệu
        serializer = MangaRankingSerializer.new(manga, {
          period_views: period_views,
          latest_chapter: latest_chapters[manga.id],
          chapters_count: chapters_count[manga.id] || 0
        })

        # Chuyển đổi thành JSON
        manga_data = serializer.as_json
        manga_data['cover_image'] = { url: manga.cover_image_url } if manga.cover_image.present?
        manga_data
      end

      # Sắp xếp theo lượt xem giảm dần, đảm bảo period_views không nil
      mangas_with_views.sort_by { |m| -(m['period_views'] || 0) }
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
