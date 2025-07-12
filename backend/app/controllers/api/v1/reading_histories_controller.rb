module Api
  module V1
    class ReadingHistoriesController < BaseController
      before_action :authenticate_user!

      def index
        @histories = current_user.reading_histories
          .select('DISTINCT ON (manga_id) *')
          .includes(:manga, :chapter)
          .order('manga_id, last_read_at DESC')

        render json: @histories, each_serializer: ReadingHistorySerializer
      end

      def create
        # Find manga by slug or ID
        manga = Manga.find_by(slug: params[:manga_id]) || Manga.find_by(id: params[:manga_id])
        Rails.logger.info "=== Found manga: #{manga&.id} (#{manga&.title}) ==="

        # Return error if manga not found
        unless manga
          Rails.logger.error "=== Failed to find manga ==="
          return render json: { errors: ["Manga not found"] }, status: :unprocessable_entity
        end

        # Extract chapter information from params
        chapter_id_param = params[:chapter_id].to_s

        # Try different approaches to find the chapter
        chapter = find_chapter(manga, chapter_id_param)

        # Return error if chapter not found
        unless chapter
          Rails.logger.error "=== Failed to find chapter ==="
          return render json: { errors: ["Chapter not found"] }, status: :unprocessable_entity
        end

        Rails.logger.info "=== Found chapter: #{chapter.id} (#{chapter.title}) for manga #{manga.id} ==="

        @history = current_user.reading_histories.find_or_initialize_by(
          manga_id: manga.id,
          chapter_id: chapter.id
        )

        if @history.save
          Rails.logger.info "=== Successfully saved reading history: #{@history.id} ==="
          render json: @history, serializer: ReadingHistorySerializer
        else
          Rails.logger.error "=== Failed to save reading history: #{@history.errors.full_messages} ==="
          render json: { errors: @history.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def find_chapter(manga, chapter_id_param)
        # Case 1: Extract ID if format is "123-slug"
        if chapter_id_param.match(/^\d+-/)
          numeric_id = chapter_id_param.split('-').first
          chapter = manga.chapters.find_by(id: numeric_id)
          return chapter if chapter
        end

        # Case 2: If param starts with "chapter-X", extract the number
        if chapter_id_param.start_with?('chapter-')
          chapter_number = chapter_id_param.sub('chapter-', '').to_f
          if chapter_number > 0
            chapter = manga.chapters.find_by(number: chapter_number)
            return chapter if chapter
          end
        end

        # Case 3: Try to find by slug within this manga
        chapter = manga.chapters.find_by(slug: chapter_id_param)
        return chapter if chapter

        # Case 4: Try to find by ID within this manga
        if chapter_id_param.match?(/^\d+$/)
          chapter = manga.chapters.find_by(id: chapter_id_param)
          return chapter if chapter
        end

        # Case 5: If all else fails, try to find any chapter with this ID or slug
        # and check if it belongs to this manga
        chapter = Chapter.find_by(slug: chapter_id_param) || Chapter.find_by(id: chapter_id_param)
        return chapter if chapter && chapter.manga_id == manga.id

        # No matching chapter found
        nil
      end

      def reading_history_params
        params.require(:reading_history).permit(:manga_id, :chapter_id)
      end
    end
  end
end
