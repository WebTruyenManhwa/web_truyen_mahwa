module Api
  module V1
    class CommentsController < BaseController
      before_action :set_comment, only: [:update, :destroy]
      
      def create
        @comment = current_user.comments.new(comment_params)
        
        if @comment.save
          render json: @comment, status: :created
        else
          render json: { errors: @comment.errors }, status: :unprocessable_entity
        end
      end
      
      def update
        if @comment.user_id == current_user.id || current_user.admin?
          if @comment.update(comment_params)
            render json: @comment
          else
            render json: { errors: @comment.errors }, status: :unprocessable_entity
          end
        else
          render json: { error: 'Bạn không có quyền cập nhật bình luận này' }, status: :forbidden
        end
      end
      
      def destroy
        if @comment.user_id == current_user.id || current_user.admin?
          @comment.destroy
          head :no_content
        else
          render json: { error: 'Bạn không có quyền xóa bình luận này' }, status: :forbidden
        end
      end
      
      private
      
      def set_comment
        @comment = Comment.find(params[:id])
      end
      
      def comment_params
        params.require(:comment).permit(:content, :commentable_type, :commentable_id)
      end
    end
  end
end 