module Api
  module V1
    class GenresController < BaseController
      skip_before_action :authenticate_user!, only: [:index, :show]
      before_action :set_genre, only: [:show, :update, :destroy]
      before_action :authorize_admin, only: [:create, :update, :destroy]
      
      def index
        @genres = Genre.all.order(:name)
        render json: @genres
      end
      
      def show
        render json: @genre
      end
      
      def create
        @genre = Genre.new(genre_params)
        
        if @genre.save
          render json: @genre, status: :created
        else
          render json: { errors: @genre.errors }, status: :unprocessable_entity
        end
      end
      
      def update
        if @genre.update(genre_params)
          render json: @genre
        else
          render json: { errors: @genre.errors }, status: :unprocessable_entity
        end
      end
      
      def destroy
        @genre.destroy
        head :no_content
      end
      
      private
      
      def set_genre
        @genre = Genre.find(params[:id])
      end
      
      def genre_params
        params.require(:genre).permit(:name, :description)
      end
      
      def authorize_admin
        unless current_user.admin?
          render json: { error: 'Chỉ admin mới có thể thực hiện hành động này' }, status: :forbidden
        end
      end
    end
  end
end 