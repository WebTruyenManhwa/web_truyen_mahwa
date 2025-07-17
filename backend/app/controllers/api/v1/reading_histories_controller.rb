module Api
  module V1
    class ReadingHistoriesController < BaseController
      before_action :authenticate_user!

      def index
        @histories = current_user.reading_histories
          .select('DISTINCT ON (manga_id) *')
          .includes(:manga, chapter: { manga: {}, chapter_image_collection: {} })
          .order('manga_id, last_read_at DESC')

        # Get all unique manga IDs and chapter IDs from the histories
        manga_ids = @histories.map { |h| h.manga_id }.uniq
        chapter_ids = @histories.map { |h| h.chapter_id }.uniq

        # Preload all chapters for these mangas to optimize next/prev chapter lookups
        # Store in instance variable to avoid redundant queries
        @cached_chapters = {}
        manga_ids.each do |manga_id|
          @cached_chapters[manga_id] = ChapterPresenterService.preload_chapters_for_manga(manga_id)
        end

        # Preload all chapter image collections in one query
        image_collections = ChapterPresenterService.preload_image_collections(chapter_ids)

        # Set the preloaded image collections to avoid N+1 queries
        @histories.each do |history|
          chapter = history.chapter

          # Set the preloaded image collection to the chapter
          if !chapter.association(:chapter_image_collection).loaded? && image_collections[chapter.id]
            chapter.association(:chapter_image_collection).target = image_collections[chapter.id]
          end
        end

        # Create a hash of chapters by manga_id for the serializer context
        chapters_by_manga = @cached_chapters

        # Create a hash of images by chapter_id for the serializer context
        images_by_chapter = {}
        chapter_ids.each do |chapter_id|
          if image_collections[chapter_id]
            chapter = @histories.find { |h| h.chapter_id == chapter_id }.chapter
            images_by_chapter[chapter_id] = chapter.images
          end
        end

        render json: @histories,
               each_serializer: ReadingHistorySerializer,
               chapters_by_manga: chapters_by_manga,
               images_by_chapter: images_by_chapter
      end

      def create
        # Extract manga_id and chapter_id from params
        # First check reading_history nested params (from API.ts changes)
        if params[:reading_history].present?
          manga_id_param = params[:reading_history][:manga_id]
          chapter_id_param = params[:reading_history][:chapter_id]
        else
          # Fallback to direct params (old format)
          manga_id_param = params[:manga_id]
          chapter_id_param = params[:chapter_id]
        end

        # Ensure we have string values
        manga_id_param = manga_id_param.to_s
        chapter_id_param = chapter_id_param.to_s

        Rails.logger.info "=== Processing reading history with manga_id: #{manga_id_param}, chapter_id: #{chapter_id_param} ==="

        # Find manga by slug or ID (with memoization)
        manga = set_manga(manga_id_param)

        # Return error if manga not found
        unless manga
          Rails.logger.error "=== Failed to find manga ==="
          return render json: { errors: ["Manga not found"] }, status: :unprocessable_entity
        end

        # Try different approaches to find the chapter (with memoization)
        chapter = find_chapter(manga, chapter_id_param)

        # Return error if chapter not found
        unless chapter
          Rails.logger.error "=== Failed to find chapter ==="
          return render json: { errors: ["Chapter not found"] }, status: :unprocessable_entity
        end

        # Use a single transaction for the entire operation
        @history = nil

        ActiveRecord::Base.transaction do
          @history = current_user.reading_histories.find_or_initialize_by(
            manga_id: manga.id,
            chapter_id: chapter.id
          )

          # Update the last_read_at timestamp
          @history.last_read_at = Time.current
          @history.save!
        end

        Rails.logger.info "=== Successfully saved reading history: #{@history.id} ==="

        # Preload chapters for this manga to optimize next/prev lookups
        # This will store all chapters in the ChapterPresenterService cache
        all_chapters = ChapterPresenterService.preload_chapters_for_manga(manga.id)

        # Preload chapter image collection
        image_collections = ChapterPresenterService.preload_image_collections([chapter.id])

        # Preload associations to avoid N+1 queries
        # We need to include manga to avoid N+1 queries in the serializer
        chapter = Chapter.includes(:manga).find(chapter.id)

        # Set the preloaded image collection to avoid the query in the presenter
        if !chapter.association(:chapter_image_collection).loaded? && image_collections[chapter.id]
          chapter.association(:chapter_image_collection).target = image_collections[chapter.id]
        end

        # Set the preloaded chapter on the history
        @history.instance_variable_set(:@chapter, chapter)

        # Set the preloaded manga on the history
        @history.instance_variable_set(:@manga, manga)

        # Create a hash of chapters by manga_id for the serializer context
        chapters_by_manga = { manga.id => all_chapters }

        # Create a hash of images by chapter_id for the serializer context
        images_by_chapter = {}
        if image_collections[chapter.id]
          images_by_chapter[chapter.id] = chapter.images
        end

        # Pass the preloaded data to the serializer via instance_options
        render json: @history,
               serializer: ReadingHistorySerializer,
               chapters_by_manga: chapters_by_manga,
               images_by_chapter: images_by_chapter
      end

      private

      def set_manga(manga_id_param)
        @manga ||= begin
          manga = Manga.find_by(slug: manga_id_param) || Manga.find_by(id: manga_id_param)
          Rails.logger.info "=== Found manga: #{manga&.id} (#{manga&.title}) ===" if manga
          manga
        end
      end

      def find_chapter(manga, chapter_id_param)
        @chapter ||= begin
          Rails.logger.info "=== Finding chapter with param: #{chapter_id_param} for manga: #{manga.id} ==="

          # Case 1: Extract ID if format is "123-slug"
          if chapter_id_param.match(/^\d+-/)
            numeric_id = chapter_id_param.split('-').first
            chapter = manga.chapters.find_by(id: numeric_id)
            Rails.logger.info "=== Case 1: ID from slug format: #{numeric_id}, found: #{chapter&.id} ==="
            return chapter if chapter
          end

          # Case 2: If param starts with "chapter-X", extract the number
          if chapter_id_param.start_with?('chapter-')
            chapter_number = chapter_id_param.sub('chapter-', '').to_f
            if chapter_number > 0
              # Direct query by number is more efficient than filtering an array
              chapter = manga.chapters.find_by(number: chapter_number)
              Rails.logger.info "=== Case 2: Chapter number: #{chapter_number}, found: #{chapter&.id} ==="
              return chapter if chapter
            end
          end

          # Case 3: Try to find by slug within this manga
          chapter = manga.chapters.find_by(slug: chapter_id_param)
          Rails.logger.info "=== Case 3: By slug: #{chapter_id_param}, found: #{chapter&.id} ==="
          return chapter if chapter

          # Case 4: Try to find by ID within this manga
          if chapter_id_param.match?(/^\d+$/)
            chapter = manga.chapters.find_by(id: chapter_id_param)
            Rails.logger.info "=== Case 4: By ID: #{chapter_id_param}, found: #{chapter&.id} ==="
            return chapter if chapter
          end

          # Case 5: If all else fails, try to find any chapter with this ID or slug
          # and check if it belongs to this manga
          chapter = Chapter.find_by(slug: chapter_id_param) || Chapter.find_by(id: chapter_id_param)
          Rails.logger.info "=== Case 5: Any chapter with slug/ID: #{chapter_id_param}, found: #{chapter&.id}, belongs to manga: #{chapter && chapter.manga_id == manga.id} ==="
          return chapter if chapter && chapter.manga_id == manga.id

          # Case 6: Try to find the first chapter of the manga as a fallback
          if manga.chapters.exists?
            first_chapter = manga.chapters.order(:number).first
            Rails.logger.info "=== Case 6: Fallback to first chapter, found: #{first_chapter&.id} ==="
            return first_chapter
          end

          # No matching chapter found
          Rails.logger.error "=== No matching chapter found for param: #{chapter_id_param} ==="
          nil
        end
      end

      def reading_history_params
        params.require(:reading_history).permit(:manga_id, :chapter_id)
      end
    end
  end
end
