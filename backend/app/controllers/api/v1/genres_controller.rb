module Api
  module V1
    class GenresController < BaseController
      skip_before_action :authenticate_user!, only: [:index, :show]
      before_action :set_genre, only: [:show, :update, :destroy]
      before_action :authorize_admin, only: [:create, :update, :destroy]

      def index
        # Thêm caching cho danh sách genre để tránh truy vấn lặp lại
        # Cache trong 1 giờ vì genres thường ít thay đổi
        @genres = Rails.cache.fetch("genres/all", expires_in: 1.hour) do
          # Chỉ lấy các trường cần thiết thay vì toàn bộ object
          Genre.select(:id, :name).order(:name).limit(50)
        end

        render json: @genres, each_serializer: GenreSerializer
      end

      def show
        render json: @genre, serializer: GenreSerializer
      end

      def create
        @genre = Genre.new(genre_params)

        if @genre.save
          # Xóa cache khi có thay đổi
          Rails.cache.delete("genres/all")
          render json: @genre, serializer: GenreSerializer, status: :created
        else
          render json: { errors: @genre.errors }, status: :unprocessable_entity
        end
      end

      def update
        if @genre.update(genre_params)
          # Xóa cache khi có thay đổi
          Rails.cache.delete("genres/all")
          render json: @genre, serializer: GenreSerializer
        else
          render json: { errors: @genre.errors }, status: :unprocessable_entity
        end
      end

      def destroy
        # Xóa cache khi có thay đổi
        Rails.cache.delete("genres/all")
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
