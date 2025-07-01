module Api
  module V1
    class ReadingHistoriesController < BaseController
      before_action :set_reading_history, only: [:update]
      
      def create
        @reading_history = current_user.reading_histories.find_or_initialize_by(chapter_id: reading_history_params[:chapter_id])
        @reading_history.last_page = reading_history_params[:last_page]
        
        if @reading_history.save
          render json: @reading_history, status: :created
        else
          render json: { errors: @reading_history.errors }, status: :unprocessable_entity
        end
      end
      
      def update
        if @reading_history.update(reading_history_params)
          render json: @reading_history
        else
          render json: { errors: @reading_history.errors }, status: :unprocessable_entity
        end
      end
      
      private
      
      def set_reading_history
        @reading_history = current_user.reading_histories.find(params[:id])
      end
      
      def reading_history_params
        params.require(:reading_history).permit(:chapter_id, :last_page)
      end
    end
  end
end 