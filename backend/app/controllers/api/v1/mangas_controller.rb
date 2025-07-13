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
          mangas = Manga.includes(:genres, :chapters)
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

        @pagy, @mangas = pagy(@mangas, items: params[:per_page] || 20)

        # Add latest chapter to each manga in the response
        manga_with_latest_chapters = @mangas.map do |manga|
          latest_chapter = manga.chapters.order(number: :desc).first
          manga_json = manga.as_json
          manga_json['latest_chapter'] = latest_chapter.as_json(only: [:id, :number, :created_at]) if latest_chapter
          manga_json
        end

        render json: {
          mangas: manga_with_latest_chapters,
          pagination: pagination_dict(@pagy)
        }
      end

      def show
        # Thêm caching cho chi tiết manga
        cache_key = "mangas/show/#{@manga.id}-#{@manga.updated_at.to_i}"

        # Kiểm tra tham số noCache để quyết định có sử dụng cache hay không
        if params[:noCache].present? && params[:noCache] == 'true'
          # Nếu có tham số noCache=true, bỏ qua cache và lấy dữ liệu mới
          increment_manga_view_count
          manga_data = @manga.as_json(include: [:genres, chapters: { only: [:id, :title, :number, :created_at, :view_count, :slug] }])
        else
          # Sử dụng cache như bình thường
          manga_data = Rails.cache.fetch(cache_key, expires_in: 30.minutes) do
            # Increment manga view count with rate limiting
            increment_manga_view_count

            @manga.as_json(include: [:genres, chapters: { only: [:id, :title, :number, :created_at, :view_count, :slug] }])
          end
        end

        render json: manga_data
      end

      def create
        @manga = Manga.new(manga_params)

        if @manga.save
          # Xóa cache khi tạo manga mới
          Rails.cache.delete_matched("mangas/index/*")
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
          Rails.cache.delete("mangas/show/#{@manga.id}-#{@manga.updated_at.to_i}")
          Rails.cache.delete_matched("mangas/index/*")
          render json: @manga
        else
          render json: { errors: @manga.errors }, status: :unprocessable_entity
        end
      end

      def destroy
        # Xóa cache khi xóa manga
        Rails.cache.delete("mangas/show/#{@manga.id}-#{@manga.updated_at.to_i}")
        Rails.cache.delete_matched("mangas/index/*")
        @manga.destroy
        head :no_content
      end

      # Lấy bảng xếp hạng theo ngày
      def rankings_day
        limit = params[:limit].present? ? params[:limit].to_i : 6
        cache_key = "rankings/day/#{limit}/#{Date.today.to_s}"

        # Cache rankings trong 1 giờ
        top_mangas = Rails.cache.fetch(cache_key, expires_in: 1.hour) do
          # Lấy tất cả manga và tính lượt xem trong ngày
          mangas_with_views = get_mangas_with_views(:day)

          # Giới hạn số lượng manga trả về
          mangas_with_views.first(limit)
        end

        render json: { mangas: top_mangas }
      end

      # Lấy bảng xếp hạng theo tuần
      def rankings_week
        limit = params[:limit].present? ? params[:limit].to_i : 6
        cache_key = "rankings/week/#{limit}/#{Date.today.beginning_of_week.to_s}"

        # Cache rankings trong 3 giờ
        top_mangas = Rails.cache.fetch(cache_key, expires_in: 3.hours) do
          # Lấy tất cả manga và tính lượt xem trong tuần
          mangas_with_views = get_mangas_with_views(:week)

          # Giới hạn số lượng manga trả về
          mangas_with_views.first(limit)
        end

        render json: { mangas: top_mangas }
      end

      # Lấy bảng xếp hạng theo tháng
      def rankings_month
        limit = params[:limit].present? ? params[:limit].to_i : 6
        cache_key = "rankings/month/#{limit}/#{Date.today.beginning_of_month.to_s}"

        # Cache rankings trong 6 giờ
        top_mangas = Rails.cache.fetch(cache_key, expires_in: 6.hours) do
          # Lấy tất cả manga và tính lượt xem trong tháng
          mangas_with_views = get_mangas_with_views(:month)

          # Giới hạn số lượng manga trả về
          mangas_with_views.first(limit)
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
      def get_mangas_with_views(period)
        # Lấy tất cả manga với thông tin cần thiết
        mangas = Manga.includes(:genres, :chapters).limit(100)

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

          # Lấy chapter mới nhất
          latest_chapter = manga.chapters.order(number: :desc).first

          # Tạo hash với thông tin manga và lượt xem
          manga_data = manga.as_json(include: [:genres])
          manga_data['period_views'] = period_views
          manga_data['latest_chapter'] = latest_chapter.as_json(only: [:id, :number, :title]) if latest_chapter
          manga_data['chapters_count'] = manga.chapters.count

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
          cache_key = "mangas/show/#{@manga.id}-#{@manga.updated_at.to_i}"
          Rails.cache.delete(cache_key)
          Rails.logger.info "=== Deleted manga cache key: #{cache_key} ==="
        end
      end

      def set_manga
        @manga = Manga.find_by(slug: params[:id]) || Manga.find(params[:id])
      end

      def manga_params
        # Handle both JSON and multipart form data
        if request.content_type =~ /multipart\/form-data/
          params.permit(:title, :description, :cover_image, :status, :author, :artist, :release_year, genre_ids: [])
        else
          params.require(:manga).permit(:title, :description, :cover_image, :status, :author, :artist, :release_year, genre_ids: [])
        end
      end
    end
  end
end
