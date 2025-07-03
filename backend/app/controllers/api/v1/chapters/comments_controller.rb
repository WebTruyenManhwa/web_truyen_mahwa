module Api
  module V1
    module Chapters
      class CommentsController < BaseController
        before_action :set_chapter
        
        def index
          @comments = @chapter.comments.includes(:user).order(created_at: :desc)
          render json: @comments
        end
        
        def create
          @comment = current_user.comments.new(comment_params)
          @comment.commentable = @chapter
          
          if @comment.save
            render json: @comment, status: :created
          else
            render json: { errors: @comment.errors }, status: :unprocessable_entity
          end
        end
        
        private
        
        def set_chapter
          @chapter = Chapter.find(params[:chapter_id])
        end
        
        def comment_params
          params.permit(:content)
        end
      end
    end
  end
end 