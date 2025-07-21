module Api
  module V1
    module Admin
      class NovelSeriesController < ApplicationController
        include Pagy::Backend
        before_action :authenticate_user!
        before_action :authorize_admin
        before_action :set_novel_series, only: [:show, :update, :destroy]

        # GET /api/v1/admin/novel_series
        def index
          @novel_series = NovelSeries.all

          # Tìm kiếm
          if params[:search].present?
            @novel_series = @novel_series.where('title ILIKE ? OR author ILIKE ?', "%#{params[:search]}%", "%#{params[:search]}%")
          end

          # Sắp xếp
          if params[:sort_by].present?
            sort_direction = params[:sort_direction] == 'desc' ? :desc : :asc
            @novel_series = @novel_series.order(params[:sort_by] => sort_direction)
          else
            @novel_series = @novel_series.order(created_at: :desc)
          end

          # Phân trang với Pagy
          @pagy, @novel_series = pagy(@novel_series, items: params[:per_page] || 10, page: params[:page] || 1)

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

        # GET /api/v1/admin/novel_series/:id
        def show
          render json: {
            novel_series: @novel_series.as_json(
              only: [:id, :title, :author, :description, :cover_image, :status, :slug, :created_at, :updated_at],
              methods: [:chapters_count]
            ),
            chapters: @novel_series.novel_chapters.as_json(
              only: [:id, :title, :chapter_number, :slug, :created_at, :updated_at]
            )
          }
        end

        # POST /api/v1/admin/novel_series
        def create
          @novel_series = NovelSeries.new(novel_series_params)

          if @novel_series.save
            render json: {
              novel_series: @novel_series.as_json(
                only: [:id, :title, :author, :description, :cover_image, :status, :slug, :created_at, :updated_at]
              ),
              message: 'Novel series created successfully'
            }, status: :created
          else
            render json: { errors: @novel_series.errors.full_messages }, status: :unprocessable_entity
          end
        end

        # PUT /api/v1/admin/novel_series/:id
        def update
          if @novel_series.update(novel_series_params)
            render json: {
              novel_series: @novel_series.as_json(
                only: [:id, :title, :author, :description, :cover_image, :status, :slug, :created_at, :updated_at]
              ),
              message: 'Novel series updated successfully'
            }
          else
            render json: { errors: @novel_series.errors.full_messages }, status: :unprocessable_entity
          end
        end

        # DELETE /api/v1/admin/novel_series/:id
        def destroy
          @novel_series.destroy
          render json: { message: 'Novel series deleted successfully' }
        end

        private

        def set_novel_series
          @novel_series = NovelSeries.find_by!(slug: params[:id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: 'Novel series not found' }, status: :not_found
        end

        def novel_series_params
          params.require(:novel_series).permit(:title, :author, :description, :cover_image, :status, :slug)
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
