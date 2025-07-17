module Api
  module V1
    module Chapters
      class CommentsController < BaseController
        before_action :set_chapter
        skip_before_action :authenticate_user!, only: [:index]

        def index
          @comments = @chapter.comments
                      .includes(:user, replies: :user)
                      .where(parent_id: nil)
                      .order(created_at: :desc)

          render json: @comments
        end

        def create
          @comment = @chapter.comments.build(comment_params)
          @comment.user = current_user

          if @comment.save
            render json: @comment, status: :created
          else
            render json: { errors: @comment.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def reply
          parent_comment = @chapter.comments.find(params[:comment_id])
          @reply = @chapter.comments.build(comment_params)
          @reply.user = current_user
          @reply.parent = parent_comment

          if @reply.save
            render json: @reply, status: :created
          else
            render json: { errors: @reply.errors.full_messages }, status: :unprocessable_entity
          end
        end

        private

        def set_chapter
          # Memoize manga to avoid redundant lookups
          @manga ||= if params[:manga_id].present?
            Manga.find_by(slug: params[:manga_id]) || Manga.find_by(id: params[:manga_id])
          end

          # Find chapter efficiently using memoized manga
          @chapter ||= if @manga
            # Try to find by number if chapter_id is in format "chapter-X"
            if params[:chapter_id].to_s.start_with?('chapter-')
              chapter_number = params[:chapter_id].sub('chapter-', '').to_f
              @manga.chapters.find_by(number: chapter_number)
            else
              # Try to find by slug or ID
              @manga.chapters.find_by(slug: params[:chapter_id]) ||
              @manga.chapters.find_by(id: params[:chapter_id])
            end
          end

          # If chapter not found, raise error
          unless @chapter
            error_message = "Couldn't find Chapter with id=#{params[:chapter_id]}"
            error_message += " for Manga with id=#{params[:manga_id]}" if @manga
            raise ActiveRecord::RecordNotFound, error_message
          end
        end

        def comment_params
          params.require(:comment).permit(:content, :sticker, stickers: [])
        end
      end
    end
  end
end