module Api
  module V1
    class ChapterImagesController < ApplicationController
      before_action :set_chapter_image, only: [:show, :update, :destroy]
      
      def index
        @chapter = Chapter.find(params[:chapter_id])
        @chapter_images = @chapter.chapter_images.ordered
        render json: @chapter_images
      end
      
      def show
        render json: @chapter_image
      end
      
      def create
        @chapter = Chapter.find(params[:chapter_id])
        @chapter_image = @chapter.chapter_images.build(chapter_image_params)
        
        if @chapter_image.save
          render json: @chapter_image, status: :created
        else
          render json: { errors: @chapter_image.errors.full_messages }, status: :unprocessable_entity
        end
      end
      
      def update
        if @chapter_image.update(chapter_image_params)
          render json: @chapter_image
        else
          render json: { errors: @chapter_image.errors.full_messages }, status: :unprocessable_entity
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
      
      def set_chapter_image
        @chapter_image = ChapterImage.find(params[:id])
      end
      
      def chapter_image_params
        params.require(:chapter_image).permit(:image, :position, :is_external, :external_url)
      end
    end
  end
end 