module Api
  module V1
    module Mangas
      class CommentsController < BaseController
        before_action :set_manga
        
        def index
          @comments = @manga.comments.includes(:user).order(created_at: :desc)
          render json: @comments
        end
        
        def create
          @comment = current_user.comments.new(comment_params)
          @comment.commentable = @manga
          
          if @comment.save
            render json: @comment, status: :created
          else
            render json: { errors: @comment.errors }, status: :unprocessable_entity
          end
        end
        
        private
        
        def set_manga
          @manga = Manga.find(params[:manga_id])
        end
        
        def comment_params
          params.permit(:content)
        end
      end
    end
  end
end 