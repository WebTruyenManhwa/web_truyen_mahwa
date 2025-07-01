module Api
  module V1
    class ChapterImagesController < BaseController
      skip_before_action :authenticate_user!, only: [:index]
      before_action :set_chapter
      before_action :set_chapter_image, only: [:show, :update, :destroy]
      
      def index
        @chapter_images = @chapter.chapter_images.ordered
        render json: @chapter_images
      end
      
      def create
        @chapter_image = @chapter.chapter_images.new(chapter_image_params)
        
        if @chapter_image.save
          render json: @chapter_image, status: :created
        else
          render json: { errors: @chapter_image.errors }, status: :unprocessable_entity
        end
      end
      
      def update
        if @chapter_image.update(chapter_image_params)
          render json: @chapter_image
        else
          render json: { errors: @chapter_image.errors }, status: :unprocessable_entity
        end
      end
      
      def destroy
        @chapter_image.destroy
        head :no_content
      end
      
      # Bulk upload images
      def bulk_create
        images = params[:images] || []
        
        ActiveRecord::Base.transaction do
          images.each_with_index do |image, index|
            @chapter.chapter_images.create!(image: image, position: index)
          end
        end
        
        render json: @chapter.chapter_images.ordered, status: :created
      rescue ActiveRecord::RecordInvalid => e
        render json: { error: e.message }, status: :unprocessable_entity
      end
      
      private
      
      def set_chapter
        @chapter = Chapter.find(params[:chapter_id])
      end
      
      def set_chapter_image
        @chapter_image = @chapter.chapter_images.find(params[:id])
      end
      
      def chapter_image_params
        params.require(:chapter_image).permit(:image, :position)
      end
    end
  end
end 