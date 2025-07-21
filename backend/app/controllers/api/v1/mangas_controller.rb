module Api
  module V1
    class MangasController < BaseController
      before_action :set_manga, only: [:show, :update, :destroy]
      before_action :authorize_admin, only: [:create, :update, :destroy, :clear_rankings_cache]
      skip_before_action :authenticate_user!, only: [:index, :show, :rankings_day, :rankings_week, :rankings_month]

      def index
        # Thêm caching cho danh sách manga
        cache_key = "mangas/index/#{CacheService.params_cache_key(params)}"

        @mangas = Rails.cache.fetch(cache_key, expires_in: 10.minutes) do
          # Sử dụng service để lấy danh sách manga
          MangaService.fetch_mangas(params)
        end

        # Giảm số lượng items mặc định xuống 20
        per_page = [params[:per_page].to_i, 50].min if params[:per_page].present?
        per_page ||= 20
        
        @pagy, @mangas = pagy(@mangas, items: per_page)

        # Lấy manga IDs cho trang hiện tại
        manga_ids = @mangas.map(&:id)

        # Đảm bảo preload genres và manga_genres để tránh N+1 queries
        # Sử dụng eager_load thay vì includes để đảm bảo associations được load hoàn toàn
        @mangas = Manga.eager_load(:genres, :manga_genres)
                      .where(id: manga_ids)
                      .order(created_at: :desc)
                      .distinct

        # Preload tất cả dữ liệu cần thiết trong một lần
        preloaded_data = preload_manga_data(manga_ids)

        # Sử dụng serializer để định dạng dữ liệu
        manga_with_latest_chapters = @mangas.map do |manga|
          # Tạo serializer với dữ liệu preload
          serializer = MangaWithChaptersSerializer.new(manga, {
            chapters_by_manga: preloaded_data[:chapters_by_manga],
            images_by_chapter: preloaded_data[:images_by_chapter]
          })

          # Thêm chapter mới nhất nếu có
          if preloaded_data[:latest_chapters][manga.id]
            serializer.add_latest_chapter(preloaded_data[:latest_chapters][manga.id])
          end

          # Thêm số lượng chapter nếu có
          if preloaded_data[:chapters_count][manga.id]
            serializer.add_chapters_count(preloaded_data[:chapters_count][manga.id])
          end

          # Chuyển đổi thành JSON
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

          # Preload dữ liệu để tránh N+1 query
          manga_data = preload_and_serialize_manga(@manga)
        else
          # Sử dụng cache như bình thường
          manga_data = Rails.cache.fetch(cache_key, expires_in: 10.minutes) do
            # Tăng lượt xem manga với giới hạn tốc độ
            MangaService.increment_view_count(@manga, request.remote_ip)

            # Preload dữ liệu để tránh N+1 query
            preload_and_serialize_manga(@manga)
          end
        end

        render json: manga_data
      end

      def create
        @manga = Manga.new(manga_params)

        if @manga.save
          # Xóa cache khi tạo manga mới
          Rails.cache.delete("mangas/index/")
          # Xóa cache bảng xếp hạng
          clear_all_rankings_cache
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
          # Xóa cache bảng xếp hạng
          clear_all_rankings_cache
          render json: @manga
        else
          render json: { errors: @manga.errors }, status: :unprocessable_entity
        end
      end

      def destroy
        # Xóa cache khi xóa manga
        CacheService.clear_manga_cache(@manga)
        # Xóa cache bảng xếp hạng
        clear_all_rankings_cache
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

      # Xóa cache bảng xếp hạng (chỉ admin)
      def clear_rankings_cache
        clear_all_rankings_cache
        render json: { message: "Rankings cache cleared successfully" }
      end

      private

      # Preload tất cả dữ liệu cần thiết cho danh sách manga trong một lần
      def preload_manga_data(manga_ids)
        # Lấy chapter mới nhất cho các manga này trong một truy vấn
        latest_chapters = MangaService.get_latest_chapters(manga_ids)

        # Lấy số lượng chapter cho mỗi manga
        chapters_count = MangaService.get_chapters_count(manga_ids)

        # Preload tất cả chapters cho các manga này để tránh N+1 query
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

      # Preload dữ liệu và serialize manga để tránh N+1 query
      def preload_and_serialize_manga(manga)
        # Preload tất cả chapters và chapter_image_collection cho manga này
        chapters = manga.chapters.includes(:chapter_image_collection, :manga).order(number: :asc).to_a

        # Sắp xếp chapters theo số chapter để tối ưu hóa việc tìm kiếm next/prev
        sorted_chapters = chapters.sort_by { |c| c.number.to_f }

        # Tạo hash để lưu trữ chapters theo manga_id
        chapters_by_manga = { manga.id => sorted_chapters }

        # Lấy tất cả chapter IDs
        chapter_ids = sorted_chapters.map(&:id)

        # Preload images cho tất cả chapter trong một truy vấn
        images_by_chapter = ChapterService.preload_images_for_chapters(chapter_ids)

        # Serialize manga với dữ liệu đã preload
        data = MangaSerializer.new(
          manga,
          chapters_by_manga: chapters_by_manga,
          images_by_chapter: images_by_chapter
        ).as_json

        # Thêm chapters vào response
        data['chapters'] = sorted_chapters.map do |chapter|
          ChapterSerializer.new(
            chapter,
            chapters_by_manga: chapters_by_manga,
            images_by_chapter: images_by_chapter
          ).as_json
        end

        # Thêm thông tin cover image
        data['cover_image'] = { url: manga.cover_image_url } if manga.cover_image.present?
        data['using_remote_cover_image'] = manga.using_remote_cover_image?

        data
      end

      # Xóa tất cả cache bảng xếp hạng
      def clear_all_rankings_cache
        # Xóa cache bảng xếp hạng ngày
        Rails.cache.delete(CacheService.rankings_day_cache_key(6))
        Rails.cache.delete(CacheService.rankings_day_cache_key(20))

        # Xóa cache bảng xếp hạng tuần
        Rails.cache.delete(CacheService.rankings_week_cache_key(6))
        Rails.cache.delete(CacheService.rankings_week_cache_key(20))

        # Xóa cache bảng xếp hạng tháng
        Rails.cache.delete(CacheService.rankings_month_cache_key(6))
        Rails.cache.delete(CacheService.rankings_month_cache_key(20))

        Rails.logger.info "=== Cleared all rankings cache ==="
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