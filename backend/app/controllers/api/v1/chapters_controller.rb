module Api
  module V1
    class ChaptersController < BaseController
      skip_before_action :authenticate_user!, only: [:index, :show]
      before_action :set_manga, except: [:show, :update, :destroy]
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
          # Xử lý tải lên hình ảnh nếu có
          if params[:images].present?
            params[:images].each_with_index do |image, index|
              @chapter.chapter_images.create(image: image, position: index)
            end
          end
          
          render json: @chapter, status: :created
        else
          render json: { errors: @chapter.errors }, status: :unprocessable_entity
        end
      end
      
      def update
        # Transaction block
        ActiveRecord::Base.transaction do
          # Update basic attributes
          if params[:title] || params[:number]
            @chapter.update!(chapter_params)
          end

          # Handle deletion of images
          if params[:image_ids_to_delete].present?
            ChapterImage.where(chapter_id: @chapter.id, id: params[:image_ids_to_delete]).destroy_all
          end

          # Reorder existing images
          if params[:image_positions].present?
            params[:image_positions].each do |id, position|
              img = @chapter.images.find(id)
              img.update!(position: position)
            end
          end

          # Attach new images
          if params[:new_images].present?
            positions = Array(params[:new_image_positions])
            Array(params[:new_images]).each_with_index do |uploaded, index|
              @chapter.images.create!(file: uploaded, position: positions[index])
            end
          end
        end

        render json: @chapter, status: :ok
      rescue ActiveRecord::RecordInvalid => e
        render json: { error: e.record.errors.full_messages }, status: :unprocessable_entity
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
      
      def chapter_params
        params.permit(:title, :number)
      end
    end
  end
end 