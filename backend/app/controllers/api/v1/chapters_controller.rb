module Api
  module V1
    class ChaptersController < BaseController
      skip_before_action :authenticate_user!, only: [:index, :show]
      before_action :set_manga, except: [:show, :update, :destroy]
      before_action :set_chapter, only: [:show, :update, :destroy]
      
      def index
        @chapters = @manga.chapters.ordered
        render json: @chapters.map { |chapter| ChapterPresenter.new(chapter).as_json }
      end
      
      def show
        # Increment view count
        @chapter.increment!(:view_count)
        
        render json: ChapterPresenter.new(@chapter).as_json
      end
      
      def create
        form = ChapterForm.new(chapter_form_params.merge(manga_id: @manga.id))
        chapter = form.save
        
        if chapter
          render json: ChapterPresenter.new(chapter).as_json, status: :created
        else
          render json: { errors: form.errors }, status: :unprocessable_entity
        end
      end
      
      def update
        form = ChapterForm.new(chapter_form_params.merge(manga_id: @chapter.manga_id, id: @chapter.id))
        chapter = form.save
        
        if chapter
          render json: ChapterPresenter.new(chapter).as_json, status: :ok
        else
          render json: { errors: form.errors }, status: :unprocessable_entity
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
        @chapter = params[:manga_id].present? ? 
                  Manga.find(params[:manga_id]).chapters.find(params[:id]) :
                  Chapter.find(params[:id])
      end
      
      def chapter_form_params
        params.permit(
          :id,
          :title, 
          :number, 
          images: [], 
          image_positions_to_delete: [], 
          image_positions: {}, 
          new_images: [], 
          new_image_positions: []
        )
      end
    end
  end
end