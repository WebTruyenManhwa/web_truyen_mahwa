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
            # Broadcast comment qua ActionCable
            channel = "chapter_#{@chapter.id}_comments"
            Rails.logger.info "Broadcasting to channel: #{channel} with comment ID: #{@comment.id}"
            ActionCable.server.broadcast(
              channel, 
              {
                event: 'new_comment',
                data: @comment.as_json(include: :user)
              }
            )
            
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
            # Broadcast reply qua ActionCable
            channel = "chapter_#{@chapter.id}_comments"
            ActionCable.server.broadcast(
              channel,
              {
                event: 'new_comment',
                data: @reply.as_json(include: :user)
              }
            )
            
            render json: @reply, status: :created
          else
            render json: { errors: @reply.errors.full_messages }, status: :unprocessable_entity
          end
        end

        private

        def set_chapter
          # Memoize manga to avoid redundant lookups
          @manga ||= if params[:manga_id].present?
            manga = Manga.find_by(slug: params[:manga_id]) || Manga.find_by(id: params[:manga_id])
            Rails.logger.info "Found manga: #{manga&.id} - #{manga&.title} - #{manga&.slug}" if manga
            manga
          end

          # Find chapter efficiently using memoized manga
          @chapter ||= if @manga
            # Try to find by number if chapter_id is in format "chapter-X" or "chapter-X-Y"
            if params[:chapter_id].to_s.start_with?('chapter-')
              chapter_id = params[:chapter_id].sub('chapter-', '')

              # Check if it's a decimal format like "chapter-47-1"
              if chapter_id.include?('-')
                parts = chapter_id.split('-')
                if parts.length == 2 && parts.all? { |part| part.match?(/^\d+$/) }
                  # Convert "47-1" to 47.1
                  integer_part = parts[0].to_i
                  decimal_part = parts[1].to_i
                  chapter_number = integer_part + (decimal_part / 10.0)
                  Rails.logger.info "Looking for chapter with decimal number: #{chapter_number} (from #{params[:chapter_id]})"
                else
                  # Regular format or other hyphenated format
                  chapter_number = chapter_id.to_f
                  Rails.logger.info "Looking for chapter with number: #{chapter_number} (from #{params[:chapter_id]})"
                end
              else
                # Simple format like "chapter-47"
                chapter_number = chapter_id.to_f
                Rails.logger.info "Looking for chapter with number: #{chapter_number} (from #{params[:chapter_id]})"
              end

              # Kiểm tra tất cả các chapter của manga này để debug
              # all_chapters = @manga.chapters.pluck(:id, :number, :title, :slug)
              # Rails.logger.info "All chapters for manga #{@manga.id}: #{all_chapters.inspect}"

              # Tìm kiếm chính xác theo số chapter
              chapter = @manga.chapters.find_by(number: chapter_number)

              # Nếu không tìm thấy, thử tìm theo slug trực tiếp
              if chapter.nil?
                Rails.logger.info "Chapter not found by number, trying to find by slug: #{params[:chapter_id]}"
                chapter = @manga.chapters.find_by(slug: params[:chapter_id])
              end

              # Nếu không tìm thấy, thử tìm với số nguyên (nếu chapter_number là số thập phân)
              if chapter.nil? && chapter_number.to_i != chapter_number
                Rails.logger.info "Trying to find chapter with integer number: #{chapter_number.to_i}"
                chapter = @manga.chapters.find_by(number: chapter_number.to_i)
              end

              # Nếu không tìm thấy, thử tìm với số thập phân (nếu chapter_number là số nguyên)
              if chapter.nil? && chapter_number.to_i == chapter_number
                Rails.logger.info "Trying to find chapter with decimal numbers: #{chapter_number}.1, #{chapter_number}.2"
                chapter = @manga.chapters.find_by(number: "#{chapter_number}.1") ||
                          @manga.chapters.find_by(number: "#{chapter_number}.2")
              end

              # Nếu vẫn không tìm thấy, thử tìm với số gần đúng
              if chapter.nil?
                Rails.logger.info "Trying to find chapter with approximate number"
                # Tìm chapter có số gần nhất với chapter_number
                closest_chapter = @manga.chapters.order(Arel.sql("ABS(number - #{chapter_number})")).first
                if closest_chapter && (closest_chapter.number - chapter_number).abs <= 0.2
                  Rails.logger.info "Found approximate chapter: #{closest_chapter.id} - #{closest_chapter.title} - #{closest_chapter.number}"
                  chapter = closest_chapter
                end
              end

              Rails.logger.info "Found chapter by number: #{chapter&.id} - #{chapter&.title} - #{chapter&.number}" if chapter
              chapter
            else
              # Try to find by slug or ID
              chapter = @manga.chapters.find_by(slug: params[:chapter_id]) || @manga.chapters.find_by(id: params[:chapter_id])
              Rails.logger.info "Found chapter by slug/id: #{chapter&.id} - #{chapter&.title}" if chapter
              chapter
            end
          end

          # If chapter not found, raise error
          unless @chapter
            error_message = "Couldn't find Chapter with id=#{params[:chapter_id]}"
            error_message += " for Manga with id=#{params[:manga_id]}" if @manga
            Rails.logger.error error_message
            raise ActiveRecord::RecordNotFound, error_message
          end
        end

        def comment_params
          params.require(:comment).permit(:content, :sticker, :parent_id, stickers: [])
        end
      end
    end
  end
end
