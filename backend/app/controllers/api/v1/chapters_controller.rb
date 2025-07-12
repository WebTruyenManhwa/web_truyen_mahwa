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
        # Generate a unique key for this IP + chapter/manga combination
        visitor_identifier = request.remote_ip
        chapter_key = "view_count:chapter:#{@chapter.id}:#{visitor_identifier}"
        manga_key = "view_count:manga:#{@chapter.manga_id}:#{visitor_identifier}"

        # Use Rails.cache for rate limiting (works with Redis or memory store)
        chapter_viewed = Rails.cache.exist?(chapter_key)
        manga_viewed = Rails.cache.exist?(manga_key)

        # Increment chapter view count if not viewed recently by this IP
        unless chapter_viewed
          @chapter.increment!(:view_count)
          # Set cache to expire after 1 hour
          Rails.cache.write(chapter_key, true, expires_in: 30.minutes)
          Rails.logger.info "=== Incremented view count for chapter #{@chapter.id} ==="
        end

        # Increment manga view count if not viewed recently by this IP
        unless manga_viewed
          @chapter.manga.increment!(:view_count)
          # Set cache to expire after 1 hour
          Rails.cache.write(manga_key, true, expires_in: 30.minutes)
          Rails.logger.info "=== Incremented view count for manga #{@chapter.manga_id} ==="
        end
      end

      def set_manga
        @manga = Manga.find_by(slug: params[:manga_id]) || Manga.find(params[:manga_id])
      end

      def set_chapter
        if params[:manga_id].present?
          # If manga_id is provided, find the chapter within that manga's chapters
          manga = Manga.find_by(slug: params[:manga_id]) || Manga.find(params[:manga_id])

          # Extract ID from combined ID-slug parameter if present
          chapter_id = params[:id].to_s.split('-').first if params[:id].to_s.match(/^\d+-/)

          if chapter_id.present?
            # If ID is part of the parameter, find by ID
            @chapter = manga.chapters.find(chapter_id)
          else
            # Try to find by slug or ID
            @chapter = manga.chapters.find_by(slug: params[:id]) || manga.chapters.find(params[:id])
          end
        else
          # For routes that don't include manga_id in the URL, find the chapter first
          # Extract ID from combined ID-slug parameter if present
          chapter_id = params[:id].to_s.split('-').first if params[:id].to_s.match(/^\d+-/)

          if chapter_id.present?
            # If ID is part of the parameter, find by ID
            @chapter = Chapter.find(chapter_id)
          else
            # Try to find by slug or ID
            @chapter = Chapter.find_by(slug: params[:id]) || Chapter.find(params[:id])
          end
        end

        # If chapter_form_params includes manga_id, verify the chapter belongs to that manga
        if params[:manga_id].present?
          manga_id = params[:manga_id]
          manga = Manga.find_by(slug: manga_id) || Manga.find_by(id: manga_id)
          unless @chapter.manga_id.to_s == manga&.id.to_s
            raise ActiveRecord::RecordNotFound, "Couldn't find Chapter with id=#{params[:id]} for Manga with id=#{manga_id}"
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
          new_image_positions: []
        )
      end
    end
  end
end
