module Api
  module V1
    module Chapters
      class CommentsController < BaseController
        before_action :set_chapter
        before_action :set_parent_comment, only: [:create]

        def index
          @comments = @chapter.comments.includes(:user, replies: [:user]).where(parent_id: nil).order(created_at: :desc)
          @comment_json = ActiveModelSerializers::SerializableResource.new(@comments, each_serializer: CommentSerializer).as_json

          @comment_json.each do |comment|
            comment[:replies].each do |reply|
              reply[:user] = UserSerializer.new(User.find(reply[:user_id])).as_json
            end
          end

          render json: @comment_json
        end

        def create
          @comment = current_user.comments.new(comment_params)
          @comment.commentable = @chapter
          @comment.parent = @parent_comment if @parent_comment
          
          if @comment.save
            render json: @comment, status: :created
          else
            render json: { errors: @comment.errors }, status: :unprocessable_entity
          end
        end
        
        private
        
        def set_chapter
          if params[:manga_id].present?
            # If manga_id is provided, find the chapter within that manga's chapters
            @chapter = Manga.find(params[:manga_id]).chapters.find(params[:chapter_id])
          else
            # For backward compatibility
            @chapter = Chapter.find(params[:chapter_id])
          end
        end
        
        def set_parent_comment
          @parent_comment = Comment.find(params[:parent_id]) if params[:parent_id].present?
        end
        
        def comment_params
          params.permit(:content, :sticker, :parent_id, stickers: [])
        end
      end
    end
  end
end 