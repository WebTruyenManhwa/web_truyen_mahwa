module Api
  module V1
    class ScheduledJobsController < BaseController
      before_action :authenticate_admin!
      before_action :set_scheduled_job, only: [:show, :retry, :cancel]

      # GET /api/v1/scheduled_jobs
      def index
        @scheduled_jobs = ScheduledJob.all

        # Lọc theo job_type nếu có
        @scheduled_jobs = @scheduled_jobs.where(job_type: params[:job_type]) if params[:job_type].present?

        # Lọc theo status nếu có
        @scheduled_jobs = @scheduled_jobs.where(status: params[:status]) if params[:status].present?

        # Sắp xếp
        @scheduled_jobs = @scheduled_jobs.order(scheduled_at: :desc)

        # Phân trang
        @scheduled_jobs = @scheduled_jobs.page(params[:page] || 1).per(params[:per_page] || 20)

        render json: {
          scheduled_jobs: @scheduled_jobs,
          meta: {
            total_count: @scheduled_jobs.total_count,
            total_pages: @scheduled_jobs.total_pages,
            current_page: @scheduled_jobs.current_page,
            per_page: @scheduled_jobs.limit_value
          }
        }
      end

      # GET /api/v1/scheduled_jobs/:id
      def show
        render json: @scheduled_job
      end

      # POST /api/v1/scheduled_jobs/:id/retry
      def retry
        # Chỉ có thể retry các job đã thất bại
        unless @scheduled_job.status == 'failed'
          return render json: { error: 'Only failed jobs can be retried' }, status: :bad_request
        end

        # Tạo một job mới với cùng các tham số
        new_job = ScheduledJob.create(
          job_type: @scheduled_job.job_type,
          status: 'pending',
          scheduled_at: Time.current,
          options: @scheduled_job.options,
          parent_job_id: @scheduled_job.id
        )

        render json: {
          message: 'Job has been scheduled for retry',
          scheduled_job: new_job
        }
      end

      # POST /api/v1/scheduled_jobs/:id/cancel
      def cancel
        # Chỉ có thể cancel các job đang pending
        unless @scheduled_job.status == 'pending'
          return render json: { error: 'Only pending jobs can be canceled' }, status: :bad_request
        end

        # Cập nhật trạng thái của job
        @scheduled_job.update(status: 'failed', error_message: 'Canceled by user')

        render json: { message: 'Job has been canceled' }
      end

      # GET /api/v1/scheduled_jobs/stats
      def stats
        stats = {
          total: ScheduledJob.count,
          pending: ScheduledJob.pending.count,
          running: ScheduledJob.running.count,
          completed: ScheduledJob.completed.count,
          failed: ScheduledJob.failed.count,
          due: ScheduledJob.due.count,
          by_job_type: ScheduledJob.group(:job_type).count
        }

        render json: { stats: stats }
      end

      private

      def set_scheduled_job
        @scheduled_job = ScheduledJob.find(params[:id])
      end
    end
  end
end
