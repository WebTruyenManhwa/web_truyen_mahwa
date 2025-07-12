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
            # Tìm manga bằng slug hoặc ID
            @manga = Manga.find_by(slug: params[:manga_id]) || Manga.find_by(id: params[:manga_id])

            if @manga.nil?
              render json: { error: "Không tìm thấy manga" }, status: :not_found
              return
            end

            # Tìm chapter bằng slug hoặc ID
            chapter_id = params[:chapter_id]

            # Nếu chapter_id có dạng "chapter-X", trích xuất số chapter
            if chapter_id.to_s.match(/^chapter-(\d+)$/)
              chapter_number = $1.to_i
              @chapter = @manga.chapters.find_by(number: chapter_number)
            else
              # Thử tìm bằng slug hoặc ID
              @chapter = @manga.chapters.find_by(slug: chapter_id) || @manga.chapters.find_by(id: chapter_id)
            end

            if @chapter.nil?
              render json: { error: "Không tìm thấy chapter" }, status: :not_found
            end
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
