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
        @chapter = if params[:manga_id].present?
                    # If manga_id is provided, find the chapter within that manga's chapters
                    Manga.find(params[:manga_id]).chapters.find(params[:id])
                  else
                    # For routes that don't include manga_id in the URL, find the chapter first
                    # then verify it belongs to the correct manga if manga_id is in the params
                    chapter = Chapter.find(params[:id])

                    # If chapter_form_params includes manga_id, verify the chapter belongs to that manga
                    if params[:manga_id] || (params[:chapter] && params[:chapter][:manga_id])
                      manga_id = params[:manga_id] || params[:chapter][:manga_id]
                      unless chapter.manga_id.to_s == manga_id.to_s
                        raise ActiveRecord::RecordNotFound, "Couldn't find Chapter with id=#{params[:id]} for Manga with id=#{manga_id}"
                      end
                    end

                    chapter
                  end
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