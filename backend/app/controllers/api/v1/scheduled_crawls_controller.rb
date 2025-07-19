module Api
  module V1
    class ScheduledCrawlsController < BaseController
      before_action :authenticate_admin!
      before_action :set_scheduled_crawl, only: [:show, :update, :destroy, :run_now]

      # GET /api/v1/scheduled_crawls
      def index
        @scheduled_crawls = ScheduledCrawl.all

        # Lọc theo manga_id nếu có
        @scheduled_crawls = @scheduled_crawls.where(manga_id: params[:manga_id]) if params[:manga_id].present?

        # Lọc theo status nếu có
        @scheduled_crawls = @scheduled_crawls.where(status: params[:status]) if params[:status].present?

        # Sắp xếp
        @scheduled_crawls = @scheduled_crawls.order(next_run_at: :asc)

        render json: @scheduled_crawls
      end

      # GET /api/v1/scheduled_crawls/:id
      def show
        render json: @scheduled_crawl
      end

      # POST /api/v1/scheduled_crawls
      def create
        # Tìm manga từ URL hoặc manga_id
        manga = find_manga_from_params

        unless manga
          return render json: { error: 'Manga not found' }, status: :not_found
        end

        @scheduled_crawl = ScheduledCrawl.new(scheduled_crawl_params)
        @scheduled_crawl.manga = manga
        @scheduled_crawl.url = params[:url] || manga.source_url

        # Đảm bảo URL hợp lệ
        unless @scheduled_crawl.url.present?
          return render json: { error: 'URL is required' }, status: :bad_request
        end

        # Kiểm tra logic max_chapters và chapter_range
        if validate_chapter_options(@scheduled_crawl)
          if @scheduled_crawl.save
            render json: @scheduled_crawl, status: :created
          else
            render json: { errors: @scheduled_crawl.errors }, status: :unprocessable_entity
          end
        end
      end

      # PATCH/PUT /api/v1/scheduled_crawls/:id
      def update
        # Kiểm tra logic max_chapters và chapter_range
        if validate_chapter_options(ScheduledCrawl.new(scheduled_crawl_params))
          if @scheduled_crawl.update(scheduled_crawl_params)
            render json: @scheduled_crawl
          else
            render json: { errors: @scheduled_crawl.errors }, status: :unprocessable_entity
          end
        end
      end

      # DELETE /api/v1/scheduled_crawls/:id
      def destroy
        @scheduled_crawl.destroy
        head :no_content
      end

      # POST /api/v1/scheduled_crawls/:id/run_now
      def run_now
        @scheduled_crawl.execute
        render json: { message: 'Scheduled crawl executed successfully' }
      end

      private

      def set_scheduled_crawl
        @scheduled_crawl = ScheduledCrawl.find(params[:id])
      end

      def scheduled_crawl_params
        params.permit(
          :manga_id, :url, :schedule_type, :schedule_time, :schedule_days,
          :max_chapters, :chapter_range, :delay, :status
        )
      end

      def find_manga_from_params
        if params[:manga_id].present?
          # Tìm manga theo ID
          Manga.find_by(id: params[:manga_id])
        elsif params[:url].present?
          # Tìm manga theo URL
          Manga.find_by(source_url: params[:url])
        else
          nil
        end
      end

      def validate_chapter_options(scheduled_crawl)
        # Kiểm tra max_chapters và chapter_range
        if scheduled_crawl.max_chapters.present? && scheduled_crawl.max_chapters.downcase != 'all'
          # Nếu max_chapters là số, kiểm tra xem có chapter_range không
          begin
            Integer(scheduled_crawl.max_chapters)

            # Nếu max_chapters là số và không có chapter_range, báo lỗi
            unless scheduled_crawl.chapter_range.present?
              render json: {
                error: 'chapter_range is required when max_chapters is a number. Format: "start-end" (e.g., "7-20")'
              }, status: :bad_request
              return false
            end

            # Kiểm tra format của chapter_range
            range_match = scheduled_crawl.chapter_range.match(/^(\d+)-(\d+)$/)
            unless range_match
              render json: {
                error: 'Invalid chapter_range format. Must be "start-end" (e.g., "7-20")'
              }, status: :bad_request
              return false
            end

            start_chapter = range_match[1].to_i
            end_chapter = range_match[2].to_i

            # Kiểm tra start_chapter <= end_chapter
            if start_chapter > end_chapter
              render json: {
                error: 'Start chapter must be less than or equal to end chapter'
              }, status: :bad_request
              return false
            end
          rescue ArgumentError
            render json: { error: 'max_chapters must be a number or "all"' }, status: :bad_request
            return false
          end
        elsif scheduled_crawl.chapter_range.present? &&
              (scheduled_crawl.max_chapters.blank? || scheduled_crawl.max_chapters.downcase == 'all')
          # Nếu max_chapters là "all" hoặc bỏ trống, không cho phép nhập chapter_range
          render json: {
            error: 'chapter_range is not allowed when max_chapters is "all" or not specified'
          }, status: :bad_request
          return false
        end

        true
      end
    end
  end
end
