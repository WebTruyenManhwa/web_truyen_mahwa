module Api
  module V1
    class ChaptersController < BaseController
      skip_before_action :authenticate_user!, only: [:index, :show]
      before_action :set_manga
      before_action :set_chapter, only: [:show, :update, :destroy]
      
      def index
        @chapters = @manga.chapters.ordered
        render json: @chapters
      end
      
      def show
        # Increment view count
        @chapter.increment!(:view_count)
        
        render json: @chapter, include: { chapter_images: { only: [:id, :image, :position] } }
      end
      
      def create
        @chapter = @manga.chapters.new(chapter_params)
        
        if @chapter.save
          render json: @chapter, status: :created
        else
          render json: { errors: @chapter.errors }, status: :unprocessable_entity
        end
      end
      
      def update
        if @chapter.update(chapter_params)
          render json: @chapter
        else
          render json: { errors: @chapter.errors }, status: :unprocessable_entity
        end
      end
      
      def destroy
        @chapter.destroy
        head :no_content
      end
      
      private
      
      def set_manga
        @manga = Manga.find(params[:manga_id])
      end
      
      def set_chapter
        @chapter = @manga.chapters.find(params[:id])
      end
      
      def chapter_params
        params.require(:chapter).permit(:title, :number)
      end
    end
  end
end 