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

      # DELETE /api/v1/comments/:id
      def destroy
        @comment = Comment.find(params[:id])

        # Chỉ cho phép xóa comment của chính mình hoặc nếu là admin
        if @comment.user_id == current_user.id || current_user.admin? || current_user.super_admin?
          @comment.destroy
          render json: { message: 'Comment đã được xóa thành công' }
        else
          render json: { error: 'Bạn không có quyền xóa comment này' }, status: :forbidden
        end
      end

      private

      def set_comment
        @comment = Comment.find(params[:id])
      end

      def comment_params
        params.require(:comment).permit(:content, :commentable_type, :commentable_id)
      end

      # Kiểm tra quyền truy cập comment
      def authorize_comment_access
        @comment = Comment.find(params[:id])

        # Chỉ cho phép truy cập comment của chính mình hoặc nếu là admin
        unless @comment.user_id == current_user.id || current_user.admin? || current_user.super_admin?
          render json: { error: 'Bạn không có quyền truy cập comment này' }, status: :forbidden
        end
      end
    end
  end
end
