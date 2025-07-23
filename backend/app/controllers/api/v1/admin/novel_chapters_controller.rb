module Api
  module V1
    module Admin
      class NovelChaptersController < ApplicationController
        include Pagy::Backend
        before_action :authenticate_user!
        before_action :authorize_admin
        before_action :set_novel_series, except: [:show, :update, :destroy]
        before_action :set_novel_chapter, only: [:show, :update, :destroy]

        # GET /api/v1/admin/novel_series/:novel_series_id/novel_chapters
        def index
          @novel_chapters = @novel_series.novel_chapters

          # Phân trang với Pagy
          @pagy, @novel_chapters = pagy(@novel_chapters, items: params[:per_page] || 20, page: params[:page] || 1)

          render json: {
            novel_chapters: @novel_chapters.as_json(
              only: [:id, :title, :chapter_number, :slug, :created_at, :updated_at]
            ),
            novel_series: @novel_series.as_json(
              only: [:id, :title, :slug]
            ),
            meta: {
              total_count: @pagy.count,
              total_pages: @pagy.pages,
              current_page: @pagy.page,
              next_page: @pagy.next,
              prev_page: @pagy.prev
            }
          }
        end

        # GET /api/v1/admin/novel_chapters/:id
        def show
          render json: {
            novel_chapter: @novel_chapter.as_json(
              only: [:id, :title, :content, :rendered_html, :chapter_number, :slug, :created_at, :updated_at]
            ),
            novel_series: @novel_chapter.novel_series.as_json(
              only: [:id, :title, :slug]
            )
          }
        end

        # POST /api/v1/admin/novel_series/:novel_series_id/novel_chapters
        def create
          # Kiểm tra xem có phải tạo chương gộp không
          if params[:batch_info].present? &&
             params[:batch_info][:start_chapter].present? &&
             params[:batch_info][:end_chapter].present?

            # Xử lý tạo chương gộp
            start_chapter = params[:batch_info][:start_chapter].to_i
            end_chapter = params[:batch_info][:end_chapter].to_i

            # Đảm bảo start_chapter < end_chapter
            if start_chapter >= end_chapter
              return render json: { errors: ["Số chương bắt đầu phải nhỏ hơn số chương kết thúc"] }, status: :unprocessable_entity
            end

            # Cập nhật tiêu đề nếu cần
            if novel_chapter_params[:title].blank?
              params[:novel_chapter][:title] = "Chương #{start_chapter}-#{end_chapter}"
            end

            # Cập nhật số chương
            params[:novel_chapter][:chapter_number] = start_chapter

            # Thêm thông tin chương gộp vào nội dung
            batch_info_text = "\n\n**Chương gộp từ #{start_chapter} đến #{end_chapter}**\n\n"
            params[:novel_chapter][:content] = batch_info_text + params[:novel_chapter][:content].to_s

            # Tạo chương mới với thông tin đã cập nhật
            @novel_chapter = @novel_series.novel_chapters.new(novel_chapter_params)
            @novel_chapter.is_batch_chapter = true
            @novel_chapter.batch_start = start_chapter
            @novel_chapter.batch_end = end_chapter
          else
            # Tạo chương thông thường
            @novel_chapter = @novel_series.novel_chapters.new(novel_chapter_params)
          end

          if @novel_chapter.save
            render json: {
              novel_chapter: @novel_chapter.as_json(
                only: [:id, :title, :content, :chapter_number, :slug, :created_at, :updated_at]
              ),
              message: 'Novel chapter created successfully'
            }, status: :created
          else
            render json: { errors: @novel_chapter.errors.full_messages }, status: :unprocessable_entity
          end
        end

        # PUT /api/v1/admin/novel_chapters/:id
        def update
          if @novel_chapter.update(novel_chapter_params)
            render json: {
              novel_chapter: @novel_chapter.as_json(
                only: [:id, :title, :content, :rendered_html, :chapter_number, :slug, :created_at, :updated_at]
              ),
              message: 'Novel chapter updated successfully'
            }
          else
            render json: { errors: @novel_chapter.errors.full_messages }, status: :unprocessable_entity
          end
        end

        # DELETE /api/v1/admin/novel_chapters/:id
        def destroy
          novel_series = @novel_chapter.novel_series
          @novel_chapter.destroy

          render json: {
            message: 'Novel chapter deleted successfully',
            novel_series_slug: novel_series.slug
          }
        end

        private

        def set_novel_series
          @novel_series = NovelSeries.find_by!(slug: params[:novel_series_id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: 'Novel series not found' }, status: :not_found
        end

        def set_novel_chapter
          # Xử lý trường hợp id có thể là slug hoặc id số
          @novel_chapter = if params[:id].to_i.to_s == params[:id]
            # Nếu id là số, tìm theo id
            NovelChapter.find(params[:id])
          else
            # Nếu id là chuỗi, tìm theo slug
            NovelChapter.find_by!(slug: params[:id])
          end
        rescue ActiveRecord::RecordNotFound
          render json: { error: 'Novel chapter not found' }, status: :not_found
        end

        def novel_chapter_params
          params.require(:novel_chapter).permit(:title, :content, :chapter_number, :slug, :is_batch_chapter, :batch_start, :batch_end)
        end

        def authorize_admin
          unless current_user.admin? || current_user.super_admin?
            render json: { error: 'Unauthorized' }, status: :unauthorized
          end
        end
      end
    end
  end
end
