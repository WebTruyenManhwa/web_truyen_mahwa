module Api
  module V1
    class MangasController < BaseController
      skip_before_action :authenticate_user!, only: [:index, :show]
      before_action :set_manga, only: [:show, :update, :destroy]
      
      def index
        @mangas = Manga.includes(:genres)
        @mangas = @mangas.where('title ILIKE ?', "%#{params[:search]}%") if params[:search].present?
        @mangas = @mangas.joins(:manga_genres).where(manga_genres: { genre_id: params[:genre_id] }) if params[:genre_id].present?
        
        case params[:sort]
        when 'popular'
          @mangas = @mangas.popular
        when 'recent'
          @mangas = @mangas.recent
        when 'alphabetical'
          @mangas = @mangas.alphabetical
        else
          @mangas = @mangas.recent
        end
        
        @pagy, @mangas = pagy(@mangas, items: params[:per_page] || 20)
        
        render json: {
          mangas: @mangas,
          pagination: pagination_dict(@pagy)
        }
      end
      
      def show
        render json: @manga, include: [:genres, chapters: { only: [:id, :title, :number, :created_at] }]
      end
      
      def create
        @manga = Manga.new(manga_params)
        
        if @manga.save
          render json: @manga, status: :created
        else
          render json: { errors: @manga.errors }, status: :unprocessable_entity
        end
      end
      
      def update
        if params[:genres]
          genre_objects = Genre.where(name: params[:genres])
          @manga.genres = genre_objects
        end

        if @manga.update(manga_params)
          render json: @manga
        else
          render json: { errors: @manga.errors }, status: :unprocessable_entity
        end
      end
      
      def destroy
        @manga.destroy
        head :no_content
      end
      
      private
      
      def set_manga
        @manga = Manga.find(params[:id])
      end
      
      def manga_params
        # Handle both JSON and multipart form data
        if request.content_type =~ /multipart\/form-data/
          params.permit(:title, :description, :cover_image, :status, :author, :artist, :release_year, genre_ids: [])
        else
          params.require(:manga).permit(:title, :description, :cover_image, :status, :author, :artist, :release_year, genre_ids: [])
        end
      end
    end
  end
end 