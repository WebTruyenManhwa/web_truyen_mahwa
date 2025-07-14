module Api
  module V1
    class ChaptersController < BaseController
      skip_before_action :authenticate_user!, only: [:index, :show]
      before_action :set_manga, except: [:show, :update, :destroy]
      before_action :set_chapter, only: [:show, :update, :destroy]

      def index
        @chapters = @manga.chapters.ordered
        render json: @chapters.map { |chapter| ChapterPresenter.new(chapter).as_json }
      end

      def show
        # Increment view counts with rate limiting
        increment_view_counts

        render json: ChapterPresenter.new(@chapter).as_json
      end

      def create
        form = ChapterForm.new(chapter_form_params.merge(manga_id: @manga.id))
        chapter = form.save

        if chapter
          render json: ChapterPresenter.new(chapter).as_json, status: :created
        else
          render json: { errors: form.errors }, status: :unprocessable_entity
        end
      end

      def update
        form = ChapterForm.new(chapter_form_params.merge(manga_id: @chapter.manga_id, id: @chapter.id))
        chapter = form.save

        if chapter
          render json: ChapterPresenter.new(chapter).as_json, status: :ok
        else
          render json: { errors: form.errors }, status: :unprocessable_entity
        end
      end

      def destroy
        @chapter.destroy
        head :no_content
      end

      private

      def increment_view_counts
        # Generate a unique key for this IP + chapter combination
        visitor_identifier = request.remote_ip
        timestamp = Time.current.to_i  # Thêm timestamp để tạo key độc nhất hơn

        # Key cho chapter view
        chapter_key = "view_count:chapter:#{@chapter.id}:#{visitor_identifier}:#{timestamp / 1800}"  # Chia cho 1800 để tạo key cho mỗi 30 phút

        # Key cho manga view từ chapter cụ thể này
        # Sử dụng chapter_id để đảm bảo mỗi chapter có key riêng
        manga_from_chapter_key = "view_count:manga_from_chapter:#{@chapter.manga_id}:#{@chapter.id}:#{visitor_identifier}"

        # Debug cache keys
        Rails.logger.debug "Chapter cache key: #{chapter_key}"
        Rails.logger.debug "Manga from chapter key: #{manga_from_chapter_key}"

        # Kiểm tra xem cache có tồn tại không
        chapter_viewed = Rails.cache.exist?(chapter_key)
        manga_from_chapter_viewed = Rails.cache.exist?(manga_from_chapter_key)

        Rails.logger.debug "Chapter cache exists: #{chapter_viewed}"
        Rails.logger.debug "Manga from chapter cache exists: #{manga_from_chapter_viewed}"

        # Kiểm tra tất cả các keys liên quan đến chapter này - Safely check if @data exists
        all_keys = []
        cache_data = Rails.cache.instance_variable_get(:@data)
        if cache_data.respond_to?(:keys)
          all_keys = cache_data.keys.select { |k| k.to_s.include?("view_count:chapter:#{@chapter.id}") }
          Rails.logger.debug "All related chapter cache keys: #{all_keys}"
        end

        # Đảm bảo view_count không phải là nil
        if @chapter.view_count.nil?
          @chapter.update_column(:view_count, 0)
          Rails.logger.info "=== Initialized view_count for chapter #{@chapter.id} ==="
        end

        # Tăng view cho chapter nếu chưa xem chapter này gần đây
        Rails.logger.debug "Current view_count for chapter #{@chapter.id}: #{@chapter.view_count}"
        unless chapter_viewed
          # Luôn tăng view_count khi có người xem chapter mới
          # Sử dụng update_column để tránh callbacks và validations
          current_view_count = @chapter.view_count || 0
          new_view_count = current_view_count + 1
          @chapter.update_column(:view_count, new_view_count)

          # Đặt cache để tránh tăng nhiều lần trong thời gian ngắn
          Rails.cache.write(chapter_key, true, expires_in: 30.minutes)
          Rails.logger.info "=== Incremented view count for chapter #{@chapter.id} from #{current_view_count} to #{new_view_count} ==="
        end

        # Tăng view cho manga nếu chưa xem chapter này gần đây
        # Mỗi chapter sẽ có key riêng để đảm bảo mỗi chapter đều đóng góp vào view của manga
        unless manga_from_chapter_viewed
          # Track manga view in database
          @chapter.manga.track_view

          # Set cache để tránh tăng nhiều lần trong thời gian ngắn
          Rails.cache.write(manga_from_chapter_key, true, expires_in: 30.minutes)
          Rails.logger.info "=== Incremented view count for manga #{@chapter.manga_id} from chapter #{@chapter.id} ==="
        end

        # Xóa cache của manga để đảm bảo dữ liệu mới nhất được trả về
        cache_key = "mangas/show/#{@chapter.manga_id}-#{@chapter.manga.updated_at.to_i}-rating#{@chapter.manga.rating}-votes#{@chapter.manga.total_votes}"
        Rails.cache.delete(cache_key)
        Rails.logger.info "=== Deleted manga cache key: #{cache_key} ==="
      end

      def set_manga
        @manga = Manga.find_by(slug: params[:manga_id]) || Manga.find(params[:manga_id])
      end

      def set_chapter
        Rails.logger.debug "Setting chapter with params: manga_id=#{params[:manga_id]}, id=#{params[:id]}"

        if params[:manga_id].present?
                # If manga_id is provided, find the chapter within that manga's chapters
          manga = Manga.find_by(slug: params[:manga_id]) || Manga.find_by(id: params[:manga_id])
          Rails.logger.debug "Found manga: #{manga&.id} - #{manga&.title}"

                # Extract ID from combined ID-slug parameter if present
          chapter_id = nil
          if params[:id].to_s.match(/^\d+-/)
            chapter_id = params[:id].to_s.split('-').first
            Rails.logger.debug "Extracted chapter_id from slug: #{chapter_id}"
          end

                if chapter_id.present?
                  # If ID is part of the parameter, find by ID
            @chapter = manga.chapters.find_by(id: chapter_id)
            Rails.logger.debug "Found chapter by ID: #{@chapter&.id} - #{@chapter&.title}"
                else
                  # Try to find by slug or ID
            @chapter = manga.chapters.find_by(slug: params[:id])
            Rails.logger.debug "Found chapter by slug: #{@chapter&.id} - #{@chapter&.title}" if @chapter

            # If not found by slug, try by ID
            if @chapter.nil?
              begin
                @chapter = manga.chapters.find(params[:id])
                Rails.logger.debug "Found chapter by ID (fallback): #{@chapter&.id} - #{@chapter&.title}"
              rescue ActiveRecord::RecordNotFound => e
                Rails.logger.error "Chapter not found: #{e.message}"
                raise
              end
            end
                end
              else
                # For routes that don't include manga_id in the URL, find the chapter first
                # Extract ID from combined ID-slug parameter if present
          chapter_id = nil
          if params[:id].to_s.match(/^\d+-/)
            chapter_id = params[:id].to_s.split('-').first
            Rails.logger.debug "Extracted chapter_id from slug (no manga): #{chapter_id}"
          end

                if chapter_id.present?
                  # If ID is part of the parameter, find by ID
            @chapter = Chapter.find_by(id: chapter_id)
            Rails.logger.debug "Found chapter by ID (no manga): #{@chapter&.id} - #{@chapter&.title}"
                else
                  # Try to find by slug or ID
            @chapter = Chapter.find_by(slug: params[:id])
            Rails.logger.debug "Found chapter by slug (no manga): #{@chapter&.id} - #{@chapter&.title}" if @chapter

            # If not found by slug, try by ID
            if @chapter.nil?
              begin
                @chapter = Chapter.find(params[:id])
                Rails.logger.debug "Found chapter by ID (fallback, no manga): #{@chapter&.id} - #{@chapter&.title}"
              rescue ActiveRecord::RecordNotFound => e
                Rails.logger.error "Chapter not found: #{e.message}"
                raise
              end
            end
          end
        end

        # Nếu không tìm thấy chapter, raise error
        unless @chapter
          error_message = "Couldn't find Chapter with id=#{params[:id]}"
          error_message += " for Manga with id=#{params[:manga_id]}" if params[:manga_id].present?
          Rails.logger.error error_message
          raise ActiveRecord::RecordNotFound, error_message
                end

                # If chapter_form_params includes manga_id, verify the chapter belongs to that manga
        if params[:manga_id].present?
          manga_id = params[:manga_id]
                  manga = Manga.find_by(slug: manga_id) || Manga.find_by(id: manga_id)
          unless @chapter.manga_id.to_s == manga&.id.to_s
            error_message = "Couldn't find Chapter with id=#{params[:id]} for Manga with id=#{manga_id}"
            Rails.logger.error error_message
            raise ActiveRecord::RecordNotFound, error_message
                end
              end
      end

      def chapter_form_params
        params.permit(
          :id,
          :title,
          :number,
          images: [],
          image_positions_to_delete: [],
          image_positions: {},
          new_images: [],
          new_image_positions: [],
          external_image_urls: []
        )
      end
    end
  end
end
