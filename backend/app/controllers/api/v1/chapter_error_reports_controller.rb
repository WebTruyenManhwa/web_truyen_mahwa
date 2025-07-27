module Api
  module V1
    class ChapterErrorReportsController < ApplicationController
      before_action :authenticate_user!, except: [:create]
      before_action :set_chapter, only: [:create, :index]
      before_action :set_error_report, only: [:show, :update, :resolve]
      before_action :authorize_admin!, only: [:index_all, :resolve, :update, :destroy]

      # GET /api/v1/mangas/:manga_id/chapters/:chapter_id/error_reports
      def index
        @error_reports = @chapter.error_reports.recent
        render json: @error_reports
      end

      # GET /api/v1/admin/error_reports
      def index_all
        @error_reports = ChapterErrorReport.includes(:chapter, :user).recent
        @error_reports = @error_reports.unresolved if params[:unresolved] == 'true'

        render json: @error_reports.as_json(
          include: {
            chapter: {
              include: { manga: { only: [:id, :title] } },
              only: [:id, :number, :title]
            },
            user: { only: [:id, :username, :email] }
          }
        )
      end

      # GET /api/v1/error_reports/:id
      def show
        render json: @error_report.as_json(
          include: {
            chapter: {
              include: { manga: { only: [:id, :title] } },
              only: [:id, :number, :title]
            },
            user: { only: [:id, :username, :email] }
          }
        )
      end

      # POST /api/v1/mangas/:manga_id/chapters/:chapter_id/error_reports
      def create
        @error_report = @chapter.error_reports.new(error_report_params)
        @error_report.user = current_user if user_signed_in?

        if @error_report.save
          # Notify admin
          notify_admin(@error_report)
          render json: @error_report, status: :created
        else
          render json: { errors: @error_report.errors }, status: :unprocessable_entity
        end
      end

      # PATCH/PUT /api/v1/error_reports/:id/resolve
      def resolve
        if @error_report.resolve!
          render json: @error_report
        else
          render json: { errors: @error_report.errors }, status: :unprocessable_entity
        end
      end

      # PATCH/PUT /api/v1/error_reports/:id
      def update
        if @error_report.update(error_report_params)
          render json: @error_report
        else
          render json: { errors: @error_report.errors }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/error_reports/:id
      def destroy
        @error_report.destroy
        head :no_content
      end

      private

      def set_chapter
        manga_id = params[:manga_id]
        chapter_id = params[:chapter_id]
        @chapter = Chapter.includes(:manga).where(manga_id: manga_id, id: chapter_id).first

        unless @chapter
          render json: { error: 'Chapter not found' }, status: :not_found
        end
      end

      def set_error_report
        @error_report = ChapterErrorReport.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Error report not found' }, status: :not_found
      end

      def error_report_params
        params.require(:error_report).permit(:error_type, :description)
      end

      def authorize_admin!
        unless current_user&.admin? || current_user&.super_admin?
          render json: { error: 'Unauthorized' }, status: :forbidden
        end
      end

      def notify_admin(error_report)
        # In a real application, you would send notifications via email, websocket, etc.
        # For now, we'll just log it
        Rails.logger.info("New error report ##{error_report.id} for Chapter #{error_report.chapter.number} of manga '#{error_report.chapter.manga.title}'")

        # Example of background job for sending email notifications:
        # AdminNotificationJob.perform_later(error_report.id, :new_error_report)
      end
    end
  end
end
