module Api
  module V1
    class NovelSeriesController < ApplicationController
      include Pagy::Backend
      before_action :set_novel_series, only: [:show]

      # GET /api/v1/novel_series
      def index
        @novel_series = NovelSeries.all

        # Tìm kiếm
        if params[:search].present?
          @novel_series = @novel_series.where('title ILIKE ? OR author ILIKE ?', "%#{params[:search]}%", "%#{params[:search]}%")
        end

        # Lọc theo trạng thái
        if params[:status].present?
          @novel_series = @novel_series.where(status: params[:status])
        end

        # Sắp xếp
        if params[:sort_by].present?
          sort_direction = params[:sort_direction] == 'desc' ? :desc : :asc
          @novel_series = @novel_series.order(params[:sort_by] => sort_direction)
        else
          @novel_series = @novel_series.order(created_at: :desc)
        end

        # Phân trang với Pagy
        @pagy, @novel_series = pagy(@novel_series, items: params[:per_page] || 12, page: params[:page] || 1)

        render json: {
          novel_series: @novel_series.as_json(
            only: [:id, :title, :author, :description, :cover_image, :status, :slug, :created_at, :updated_at],
            methods: [:chapters_count]
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

      # GET /api/v1/novel_series/:id
      def show
        render json: {
          novel_series: @novel_series.as_json(
            only: [:id, :title, :author, :description, :cover_image, :status, :slug, :created_at, :updated_at],
            methods: [:chapters_count]
          ),
          chapters: @novel_series.novel_chapters.as_json(only: [:id, :title, :chapter_number, :slug, :created_at])
        }
      end

      private

      def set_novel_series
        @novel_series = NovelSeries.find_by!(slug: params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Novel series not found' }, status: :not_found
      end
    end
  end
end
