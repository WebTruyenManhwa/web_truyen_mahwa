module Api
  module V1
    class NovelChaptersController < ApplicationController
      include Pagy::Backend
      before_action :set_novel_series
      before_action :set_novel_chapter, only: [:show]

      # GET /api/v1/novel_series/:novel_series_id/novel_chapters
      def index
        @novel_chapters = @novel_series.novel_chapters

        # Phân trang với Pagy
        @pagy, @novel_chapters = pagy(@novel_chapters, items: params[:per_page] || 20, page: params[:page] || 1)

        render json: {
          novel_chapters: @novel_chapters.as_json(only: [:id, :title, :chapter_number, :slug, :created_at, :updated_at]),
          meta: {
            total_count: @pagy.count,
            total_pages: @pagy.pages,
            current_page: @pagy.page,
            next_page: @pagy.next,
            prev_page: @pagy.prev
          }
        }
      end

      # GET /api/v1/novel_series/:novel_series_id/novel_chapters/:id
      def show
        # Tìm chapter trước và sau
        @prev_chapter = @novel_series.novel_chapters.where('chapter_number < ?', @novel_chapter.chapter_number).order(chapter_number: :desc).first
        @next_chapter = @novel_series.novel_chapters.where('chapter_number > ?', @novel_chapter.chapter_number).order(chapter_number: :asc).first

        render json: {
          novel_chapter: @novel_chapter.as_json(only: [:id, :title, :content, :chapter_number, :slug, :created_at, :updated_at]),
          novel_series: @novel_series.as_json(only: [:id, :title, :slug]),
          navigation: {
            prev_chapter: @prev_chapter&.as_json(only: [:id, :title, :chapter_number, :slug]),
            next_chapter: @next_chapter&.as_json(only: [:id, :title, :chapter_number, :slug])
          }
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
          @novel_series.novel_chapters.find(params[:id])
        else
          # Nếu id là chuỗi, tìm theo slug
          @novel_series.novel_chapters.find_by!(slug: params[:id])
        end
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Novel chapter not found' }, status: :not_found
      end
    end
  end
end
