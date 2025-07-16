module Api
  module V1
    class MangasController < BaseController
      before_action :set_manga, only: [:show, :update, :destroy]
      before_action :authorize_admin, only: [:create, :update, :destroy]
      skip_before_action :authenticate_user!, only: [:index, :show, :rankings_day, :rankings_week, :rankings_month]

      def index
        # Thêm caching cho danh sách manga
        cache_key = "mangas/index/#{CacheService.params_cache_key(params)}"

        @mangas = Rails.cache.fetch(cache_key, expires_in: 10.minutes) do
          # Sử dụng service để lấy danh sách manga
          MangaService.fetch_mangas(params)
        end

        # Giảm số lượng items mặc định xuống 20
        @pagy, @mangas = pagy(@mangas, items: params[:per_page] || 20)
        # Lấy manga IDs cho trang hiện tại
        manga_ids = @mangas.map(&:id)

        # Lấy chapter mới nhất cho các manga này trong một truy vấn
        latest_chapters = MangaService.get_latest_chapters(manga_ids)

        # Sử dụng serializer để định dạng dữ liệu
        manga_with_latest_chapters = @mangas.map do |manga|
          serializer = MangaWithChaptersSerializer.new(manga)

          # Thêm chapter mới nhất nếu có
          if latest_chapters[manga.id]
            serializer.add_latest_chapter(latest_chapters[manga.id])
          end

          serializer.as_json
        end

        render json: {
          mangas: manga_with_latest_chapters,
          pagination: pagination_dict(@pagy)
        }
      end

      def show
        # Thêm caching cho chi tiết manga
        # Bao gồm rating và total_votes trong cache key để đảm bảo dữ liệu mới khi rating thay đổi
        cache_key = CacheService.manga_show_cache_key(@manga)

        # Kiểm tra tham số noCache để quyết định có sử dụng cache hay không
        if params[:noCache].present? || params[:_].present?
          # Nếu có tham số noCache=true hoặc timestamp parameter, bỏ qua cache và lấy dữ liệu mới
          Rails.logger.info "=== Bypassing cache for manga #{@manga.id} (#{@manga.title}), rating: #{@manga.rating}, votes: #{@manga.total_votes} ==="

          # Đảm bảo có dữ liệu mới nhất từ database
          @manga.reload

          # Tăng lượt xem manga
          MangaService.increment_view_count(@manga, request.remote_ip)

          # Sử dụng serializer để định dạng dữ liệu
          manga_data = ActiveModelSerializers::SerializableResource.new(
            @manga,
            include: [:genres, :chapters]
          ).as_json

          manga_data['cover_image'] = { url: @manga.cover_image_url } if @manga.cover_image.present?
          manga_data['using_remote_cover_image'] = @manga.using_remote_cover_image?
        else
          # Sử dụng cache như bình thường
          manga_data = Rails.cache.fetch(cache_key, expires_in: 10.minutes) do
            # Tăng lượt xem manga với giới hạn tốc độ
            MangaService.increment_view_count(@manga, request.remote_ip)

            # Sử dụng serializer để định dạng dữ liệu
            data = ActiveModelSerializers::SerializableResource.new(
              @manga,
              include: [:genres, :chapters]
            ).as_json

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
          CacheService.clear_manga_cache(@manga)
          render json: @manga
        else
          render json: { errors: @manga.errors }, status: :unprocessable_entity
        end
      end

      def destroy
        # Xóa cache khi xóa manga
        CacheService.clear_manga_cache(@manga)
        @manga.destroy
        head :no_content
      end

      # Lấy bảng xếp hạng theo ngày
      def rankings_day
        limit = params[:limit].present? ? [params[:limit].to_i, 20].min : 6
        cache_key = CacheService.rankings_day_cache_key(limit)

        # Cache rankings trong 1 giờ
        top_mangas = Rails.cache.fetch(cache_key, expires_in: 1.hour) do
          # Lấy tất cả manga và tính lượt xem trong ngày
          MangaService.get_rankings(:day, limit)
        end

        render json: { mangas: top_mangas }
      end

      # Lấy bảng xếp hạng theo tuần
      def rankings_week
        limit = params[:limit].present? ? [params[:limit].to_i, 20].min : 6
        cache_key = CacheService.rankings_week_cache_key(limit)

        # Cache rankings trong 3 giờ
        top_mangas = Rails.cache.fetch(cache_key, expires_in: 3.hours) do
          # Lấy tất cả manga và tính lượt xem trong tuần
          MangaService.get_rankings(:week, limit)
        end

        render json: { mangas: top_mangas }
      end

      # Lấy bảng xếp hạng theo tháng
      def rankings_month
        limit = params[:limit].present? ? [params[:limit].to_i, 20].min : 6
        cache_key = CacheService.rankings_month_cache_key(limit)

        # Cache rankings trong 6 giờ
        top_mangas = Rails.cache.fetch(cache_key, expires_in: 6.hours) do
          # Lấy tất cả manga và tính lượt xem trong tháng
          MangaService.get_rankings(:month, limit)
        end

        render json: { mangas: top_mangas }
      end

      private

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
