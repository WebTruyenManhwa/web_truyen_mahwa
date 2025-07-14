module Api
  module V1
    class MangasController < BaseController
      before_action :set_manga, only: [:show, :update, :destroy]
      before_action :authorize_admin, only: [:create, :update, :destroy]
      skip_before_action :authenticate_user!, only: [:index, :show, :rankings_day, :rankings_week, :rankings_month]

      def index
        # Thêm caching cho danh sách manga
        cache_key = "mangas/index/#{params_cache_key}"

        @mangas = Rails.cache.fetch(cache_key, expires_in: 10.minutes) do
          # Chỉ select các trường cần thiết thay vì tất cả
          mangas = Manga.select(:id, :title, :slug, :status, :view_count, :rating, :total_votes, :cover_image, :created_at, :updated_at)
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

        # Giảm số lượng items mặc định xuống 20
        @pagy, @mangas = pagy(@mangas, items: params[:per_page] || 20)
        # Get manga IDs for the current page
        manga_ids = @mangas.map(&:id)

        # Get latest chapters for these mangas in a single query
        latest_chapters = {}
        if manga_ids.any?
          # Use a subquery to get the latest chapter for each manga
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

          # Execute the query directly
          result = ActiveRecord::Base.connection.execute(latest_chapters_sql)

          # Process the results
          result.each do |row|
            latest_chapters[row['manga_id']] = {
              id: row['id'],
              number: row['number'],
              created_at: row['created_at']
            }
          end
        end

        # Build the response
        manga_with_latest_chapters = @mangas.map do |manga|
          # Create the basic manga JSON
          manga_json = manga.as_json(only: [:id, :title, :slug, :status, :view_count, :rating, :total_votes, :cover_image, :created_at, :updated_at])

          # Add the latest chapter if available
          if latest_chapters[manga.id]
            manga_json['latest_chapter'] = latest_chapters[manga.id]
          end
          # Add cover image if available
          manga_json['cover_image'] = { url: manga.cover_image_url } if manga.cover_image.present?

          manga_json
        end

        render json: {
          mangas: manga_with_latest_chapters,
          pagination: pagination_dict(@pagy)
        }
      end

      def show
        # Thêm caching cho chi tiết manga
        # Include rating and total_votes in the cache key to ensure we get fresh data when ratings change
        cache_key = "mangas/show/#{@manga.id}-#{@manga.updated_at.to_i}-rating#{@manga.rating}-votes#{@manga.total_votes}"

        # Kiểm tra tham số noCache để quyết định có sử dụng cache hay không
        if params[:noCache].present? || params[:_].present?
          # Nếu có tham số noCache=true hoặc timestamp parameter, bỏ qua cache và lấy dữ liệu mới
          Rails.logger.info "=== Bypassing cache for manga #{@manga.id} (#{@manga.title}), rating: #{@manga.rating}, votes: #{@manga.total_votes} ==="

          # Make sure we have the latest data from the database
          @manga.reload

          increment_manga_view_count
          manga_data = @manga.as_json(
            only: [:id, :title, :description, :status, :author, :artist, :release_year, :view_count, :rating, :total_votes, :slug, :updated_at],
            include: {
              genres: { only: [:id, :name] },
              chapters: { only: [:id, :title, :number, :created_at, :view_count, :slug] }
            }
          )

          manga_data['cover_image'] = { url: @manga.cover_image_url } if @manga.cover_image.present?
          manga_data['using_remote_cover_image'] = @manga.using_remote_cover_image?
        else
          # Sử dụng cache như bình thường
          manga_data = Rails.cache.fetch(cache_key, expires_in: 10.minutes) do
            # Increment manga view count with rate limiting
            increment_manga_view_count

            data = @manga.as_json(
              only: [:id, :title, :description, :status, :author, :artist, :release_year, :view_count, :rating, :total_votes, :slug, :updated_at],
              include: {
                genres: { only: [:id, :name] },
                chapters: { only: [:id, :title, :number, :created_at, :view_count, :slug] }
              }
            )

            data['cover_image'] = { url: @manga.cover_image_url } if @manga.cover_image.present?
            data['using_remote_cover_image'] = @manga.using_remote_cover_image?
            data
          end
        end

        render json: manga_data
      end

      def create
        @manga = Manga.new(manga_params)

        if @manga.save
          # Xóa cache khi tạo manga mới
          # Thay vì sử dụng delete_matched
          Rails.cache.delete("mangas/index/")
          render json: @manga, status: :created
        else
          render json: { errors: @manga.errors }, status: :unprocessable_entity
        end
      end

      def update
        if params[:genres]
          genre_objects = Genre.where(name: params[:genres])
          @manga.genres = genre_objects
        end

        if @manga.update(manga_params)
          # Xóa cache khi cập nhật manga
          # Thay vì sử dụng delete_matched
          cache_key = "mangas/show/#{@manga.id}-#{@manga.updated_at.to_i}-rating#{@manga.rating}-votes#{@manga.total_votes}"
          Rails.cache.delete(cache_key)
          Rails.cache.delete("mangas/index/")
          render json: @manga
        else
          render json: { errors: @manga.errors }, status: :unprocessable_entity
        end
      end

      def destroy
        # Xóa cache khi xóa manga
        # Thay vì sử dụng delete_matched
        cache_key = "mangas/show/#{@manga.id}-#{@manga.updated_at.to_i}-rating#{@manga.rating}-votes#{@manga.total_votes}"
        Rails.cache.delete(cache_key)
        Rails.cache.delete("mangas/index/")
        @manga.destroy
        head :no_content
      end

      # Lấy bảng xếp hạng theo ngày
      def rankings_day
        limit = params[:limit].present? ? [params[:limit].to_i, 20].min : 6
        cache_key = "rankings/day/#{limit}/#{Date.today.to_s}"

        # Cache rankings trong 1 giờ
        top_mangas = Rails.cache.fetch(cache_key, expires_in: 1.hour) do
          # Lấy tất cả manga và tính lượt xem trong ngày
          mangas_with_views = get_mangas_with_views(:day, limit)

          # Giới hạn số lượng manga trả về
          mangas_with_views
        end

        render json: { mangas: top_mangas }
      end

      # Lấy bảng xếp hạng theo tuần
      def rankings_week
        limit = params[:limit].present? ? [params[:limit].to_i, 20].min : 6
        cache_key = "rankings/week/#{limit}/#{Date.today.beginning_of_week.to_s}"

        # Cache rankings trong 3 giờ
        top_mangas = Rails.cache.fetch(cache_key, expires_in: 3.hours) do
          # Lấy tất cả manga và tính lượt xem trong tuần
          mangas_with_views = get_mangas_with_views(:week, limit)

          # Giới hạn số lượng manga trả về
          mangas_with_views
        end

        render json: { mangas: top_mangas }
      end

      # Lấy bảng xếp hạng theo tháng
      def rankings_month
        limit = params[:limit].present? ? [params[:limit].to_i, 20].min : 6
        cache_key = "rankings/month/#{limit}/#{Date.today.beginning_of_month.to_s}"

        # Cache rankings trong 6 giờ
        top_mangas = Rails.cache.fetch(cache_key, expires_in: 6.hours) do
          # Lấy tất cả manga và tính lượt xem trong tháng
          mangas_with_views = get_mangas_with_views(:month, limit)

          # Giới hạn số lượng manga trả về
          mangas_with_views
        end

        render json: { mangas: top_mangas }
      end

      private

      # Tạo cache key từ params
      def params_cache_key
        keys = []
        keys << "search=#{params[:search]}" if params[:search].present?
        keys << "genre=#{params[:genre_id]}" if params[:genre_id].present?
        keys << "sort=#{params[:sort]}" if params[:sort].present?
        keys << "page=#{params[:page] || 1}"
        keys << "per_page=#{params[:per_page] || 20}"
        keys.join('&')
      end

      # Lấy danh sách manga với lượt xem theo thời gian
      def get_mangas_with_views(period, limit = 20)
        # Lấy tất cả manga với thông tin cần thiết, giới hạn số lượng
        mangas = Manga.select(:id, :title, :slug, :view_count, :rating, :total_votes, :cover_image)
                     .includes(:genres)
                     .limit(limit)

        # Lấy danh sách manga IDs
        manga_ids = mangas.map(&:id)

        # Get latest chapters and chapter counts in a single query
        latest_chapters = {}
        chapters_count = {}

        if manga_ids.any?
          # Get latest chapter for each manga
          latest_chapters_sql = <<-SQL
            WITH ranked_chapters AS (
              SELECT
                id,
                manga_id,
                number,
                title,
                ROW_NUMBER() OVER (PARTITION BY manga_id ORDER BY number::decimal DESC) as rn
              FROM chapters
              WHERE manga_id IN (#{manga_ids.join(',')})
            )
            SELECT id, manga_id, number, title
            FROM ranked_chapters
            WHERE rn = 1
          SQL

          # Execute the query directly
          ActiveRecord::Base.connection.execute(latest_chapters_sql).each do |row|
            latest_chapters[row['manga_id']] = {
              id: row['id'],
              number: row['number'],
              title: row['title']
            }
          end

          # Get chapter count for each manga
          count_sql = "SELECT manga_id, COUNT(*) as count FROM chapters WHERE manga_id IN (#{manga_ids.join(',')}) GROUP BY manga_id"
          ActiveRecord::Base.connection.execute(count_sql).each do |row|
            chapters_count[row['manga_id']] = row['count']
          end
        end

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

          # Nếu không có lượt xem, sử dụng view_count từ manga
          period_views = manga.view_count if period_views == 0

          # Tạo hash với thông tin manga và lượt xem
          manga_data = manga.as_json(
            only: [:id, :title, :slug, :view_count, :rating, :total_votes, :cover_image],
            include: { genres: { only: [:id, :name] } }
          )
          manga_data['period_views'] = period_views

          # Add latest chapter if available
          manga_data['latest_chapter'] = latest_chapters[manga.id] if latest_chapters[manga.id]

          # Add chapter count
          manga_data['chapters_count'] = chapters_count[manga.id] || 0

          # Add cover image
          manga_data['cover_image'] = { url: manga.cover_image_url } if manga.cover_image.present?

          manga_data
        end

        # Sắp xếp theo lượt xem giảm dần
        mangas_with_views.sort_by { |m| -m['period_views'] }
      end

      def increment_manga_view_count
        # Generate a unique key for this IP + manga combination
        visitor_identifier = request.remote_ip
        manga_key = "view_count:manga_page:#{@manga.id}:#{visitor_identifier}"

        # Use Rails.cache for rate limiting
        manga_viewed = Rails.cache.exist?(manga_key)

        # Increment manga view count if not viewed recently by this IP
        unless manga_viewed
          # Track view in database
          @manga.track_view

          # Set cache to expire after 30 minutes
          Rails.cache.write(manga_key, true, expires_in: 30.minutes)
          Rails.logger.info "=== Incremented view count for manga page #{@manga.id} (#{@manga.title}) ==="

          # Xóa cache của manga để đảm bảo dữ liệu mới nhất được trả về
          # Thay vì sử dụng delete_matched, sử dụng delete với cache key cụ thể
          cache_key = "mangas/show/#{@manga.id}-#{@manga.updated_at.to_i}-rating#{@manga.rating}-votes#{@manga.total_votes}"
          Rails.cache.delete(cache_key)
          Rails.logger.info "=== Deleted manga cache key: #{cache_key} ==="
        end
      end

      def set_manga
        @manga = Manga.find_by(slug: params[:id]) || Manga.find(params[:id])
      end

      def manga_params
        # Handle both JSON and multipart form data
        params_to_permit = [:title, :description, :cover_image, :remote_cover_image_url, :status, :author, :artist, :release_year, genre_ids: []]

        # If remote_cover_image_url is present, automatically set use_remote_url to '1'
        if params[:remote_cover_image_url].present? || params[:manga]&.dig(:remote_cover_image_url).present?
          params[:use_remote_url] = '1' if params[:use_remote_url].nil?
          params[:manga][:use_remote_url] = '1' if params[:manga] && params[:manga][:use_remote_url].nil?
          params_to_permit << :use_remote_url
        end

        if request.content_type =~ /multipart\/form-data/
          params.permit(*params_to_permit)
        else
          params.require(:manga).permit(*params_to_permit)
        end
      end
    end
  end
end
