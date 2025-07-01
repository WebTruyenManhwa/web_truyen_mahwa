module Api
  module V1
    class FavoritesController < BaseController
      before_action :set_favorite, only: [:destroy]
      
      def create
        @favorite = current_user.favorites.new(favorite_params)
        
        if @favorite.save
          render json: @favorite, status: :created
        else
          render json: { errors: @favorite.errors }, status: :unprocessable_entity
        end
      end
      
      def destroy
        @favorite.destroy
        head :no_content
      end
      
      private
      
      def set_favorite
        @favorite = current_user.favorites.find(params[:id])
      end
      
      def favorite_params
        params.require(:favorite).permit(:manga_id)
      end
    end
  end
end 