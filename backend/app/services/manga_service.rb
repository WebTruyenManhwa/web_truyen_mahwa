class MangaService
  class << self
    # Lấy danh sách manga với các bộ lọc
    def fetch_mangas(params)
      # Chỉ select các trường cần thiết thay vì tất cả
      mangas = Manga.select(:id, :title, :description, :slug, :status, :author, :artist, :release_year, :view_count, :rating, :total_votes, :cover_image, :created_at, :updated_at)
                   .eager_load(:genres, :manga_genres) # Sử dụng eager_load thay vì includes

      # Thêm điều kiện tìm kiếm nếu có
      if params[:search].present?
        mangas = mangas.where('title ILIKE ?', "%#{params[:search]}%")
      end

      # Thêm điều kiện lọc theo genre nếu có
      if params[:genre_id].present?
        mangas = mangas.joins(:manga_genres).where(manga_genres: { genre_id: params[:genre_id] })
      end

      # Sắp xếp theo tiêu chí
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

      # Giới hạn số lượng manga_ids để tránh truy vấn quá lớn
      if manga_ids.size > 100
        Rails.logger.warn "Large number of manga_ids (#{manga_ids.size}) in get_latest_chapters, limiting to 100"
        manga_ids = manga_ids.take(100)
      end

      latest_chapters = {}
      
      # Sử dụng prepared statement để tránh SQL injection
      placeholders = manga_ids.map.with_index { |_, i| "$#{i+1}" }.join(',')
      latest_chapters_sql = <<-SQL
        SELECT DISTINCT ON (manga_id) id, manga_id, number, title, slug, created_at
        FROM chapters
        WHERE manga_id IN (#{placeholders})
        ORDER BY manga_id, number::decimal DESC
      SQL

      # Thực thi truy vấn với tham số an toàn
      begin
        result = ActiveRecord::Base.connection.exec_query(
          latest_chapters_sql,
          'Get latest chapters',
          manga_ids.map { |id| id }
        )

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
      rescue => e
        Rails.logger.error "Error in get_latest_chapters: #{e.message}"
      end
      
      latest_chapters
    end

    # Lấy số lượng chapter cho danh sách manga - đã tối ưu để tránh N+1 query
    def get_chapters_count(manga_ids)
      return {} if manga_ids.empty?

      # Giới hạn số lượng manga_ids để tránh truy vấn quá lớn
      if manga_ids.size > 100
        Rails.logger.warn "Large number of manga_ids (#{manga_ids.size}) in get_chapters_count, limiting to 100"
        manga_ids = manga_ids.take(100)
      end

      # Sử dụng prepared statement để tránh SQL injection
      placeholders = manga_ids.map.with_index { |_, i| "$#{i+1}" }.join(',')
      count_sql = "SELECT manga_id, COUNT(*) as count FROM chapters WHERE manga_id IN (#{placeholders}) GROUP BY manga_id"
      
      chapters_count = {}
      
      begin
        result = ActiveRecord::Base.connection.exec_query(
          count_sql,
          'Get chapters count',
          manga_ids.map { |id| id }
        )
        
        result.each do |row|
          chapters_count[row['manga_id']] = row['count']
        end
      rescue => e
        Rails.logger.error "Error in get_chapters_count: #{e.message}"
      end

      chapters_count
    end

    # Lấy bảng xếp hạng manga theo thời gian - tối ưu để tránh N+1 query
    def get_rankings(period, limit = 20)
      # Lấy lượt xem theo thời gian cho tất cả manga trong một truy vấn duy nhất
      period_views_data = get_period_views_for_all_manga(period)

      # Sắp xếp manga_ids theo lượt xem giảm dần
      sorted_manga_ids = period_views_data.sort_by { |_, views| -views }.map { |manga_id, _| manga_id }.take(limit)

      return [] if sorted_manga_ids.empty?

      # Lấy tất cả manga với thông tin cần thiết, chỉ lấy những manga đã được sắp xếp
      mangas = Manga.select(:id, :title, :description, :status, :author, :artist, :release_year, :slug, :view_count, :rating, :total_votes, :cover_image, :created_at, :updated_at)
                   .eager_load(:genres, :manga_genres) # Sử dụng eager_load thay vì includes
                   .where(id: sorted_manga_ids)
                   .index_by(&:id)

      # Preload tất cả dữ liệu cần thiết trong một lần
      preloaded_data = preload_ranking_data(sorted_manga_ids)

      # Tính lượt xem cho từng manga theo thời gian
      mangas_with_views = sorted_manga_ids.map do |manga_id|
        manga = mangas[manga_id]
        next unless manga

        # Lấy lượt xem từ dữ liệu đã tính toán trước đó
        period_views = period_views_data[manga_id] || manga.view_count || 0

        # Sử dụng serializer để định dạng dữ liệu
        serializer = MangaRankingSerializer.new(manga, {
          period_views: period_views,
          latest_chapter: preloaded_data[:latest_chapters][manga_id],
          chapters_count: preloaded_data[:chapters_count][manga_id] || 0,
          chapters_by_manga: preloaded_data[:chapters_by_manga],
          images_by_chapter: preloaded_data[:images_by_chapter]
        })

        # Chuyển đổi thành JSON
        manga_data = serializer.as_json
        manga_data['cover_image'] = { url: manga.cover_image_url } if manga.cover_image.present?

        # Không bao gồm chapters trong kết quả rankings để tránh lỗi serializer
        manga_data.delete('chapters')

        manga_data
      end.compact

      mangas_with_views
    end

    # Preload tất cả dữ liệu cần thiết cho bảng xếp hạng trong một lần
    def preload_ranking_data(manga_ids)
      # Lấy chapter mới nhất và số lượng chapter trong một truy vấn duy nhất cho mỗi loại
      latest_chapters = get_latest_chapters(manga_ids)
      chapters_count = get_chapters_count(manga_ids)

      # Preload chapters và images để tránh N+1 query
      chapters_by_manga = ChapterService.preload_chapters_for_mangas(manga_ids)

      # Lấy tất cả chapter IDs
      all_chapter_ids = chapters_by_manga.values.flatten.map(&:id)

      # Chỉ preload ảnh đầu tiên cho mỗi chapter để tối ưu hóa hiệu suất
      images_by_chapter = ChapterService.preload_first_images_for_chapters(all_chapter_ids)

      {
        latest_chapters: latest_chapters,
        chapters_count: chapters_count,
        chapters_by_manga: chapters_by_manga,
        images_by_chapter: images_by_chapter
      }
    end

    # Lấy lượt xem theo thời gian cho tất cả manga
    def get_period_views_for_all_manga(period)
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
      cache_key = "manga_views_all/#{period}/#{start_date.to_i}"

      # Sử dụng cache để giảm tải database
      Rails.cache.fetch(cache_key, expires_in: 1.hour) do
        # Truy vấn SQL để lấy tổng lượt xem cho mỗi manga trong khoảng thời gian
        # Sử dụng format chuỗi ISO 8601 cho thời gian để tránh lỗi
        formatted_date = start_date.strftime('%Y-%m-%d %H:%M:%S')
        
        # Sử dụng prepared statement để tránh SQL injection
        sql = <<-SQL
          SELECT manga_id, SUM(view_count) as total_views
          FROM manga_views
          WHERE created_at >= $1
          GROUP BY manga_id
          LIMIT 100
        SQL

        # Thực thi truy vấn với tham số an toàn
        views_data = {}
        begin
          result = ActiveRecord::Base.connection.exec_query(
            sql, 
            'Get period views',
            [[nil, formatted_date]]
          )
          
          result.each do |row|
            views_data[row['manga_id'].to_i] = row['total_views'].to_i
          end
        rescue => e
          Rails.logger.error "Error in get_period_views_for_all_manga: #{e.message}"
        end

        # Nếu không có dữ liệu views, lấy từ manga.view_count (giới hạn 100 manga)
        if views_data.empty?
          Manga.select(:id, :view_count).limit(100).each do |manga|
            views_data[manga.id] = manga.view_count.to_i
          end
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
