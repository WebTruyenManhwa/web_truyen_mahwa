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
        @history = current_user.reading_histories.find_or_initialize_by(
          manga_id: params[:manga_id],
          chapter_id: params[:chapter_id]
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