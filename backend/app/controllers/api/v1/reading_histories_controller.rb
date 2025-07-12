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

        # Extract chapter ID from slug-id format if present
        chapter_id_param = params[:chapter_id].to_s
        chapter_id = chapter_id_param.split('-').first if chapter_id_param.match(/^\d+-/)

        # Find chapter by ID or slug
        chapter = if chapter_id.present?
                    Chapter.find_by(id: chapter_id)
                  else
                    Chapter.find_by(slug: chapter_id_param) || Chapter.find_by(id: chapter_id_param)
                  end

        # Return error if manga or chapter not found
        unless manga && chapter
          return render json: { errors: ["Manga or chapter not found"] }, status: :unprocessable_entity
        end

        @history = current_user.reading_histories.find_or_initialize_by(
          manga_id: manga.id,
          chapter_id: chapter.id
        )

        if @history.save
          render json: @history, serializer: ReadingHistorySerializer
        else
          render json: { errors: @history.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def reading_history_params
        params.require(:reading_history).permit(:manga_id, :chapter_id)
      end
    end
  end
end
