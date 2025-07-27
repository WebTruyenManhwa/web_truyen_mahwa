module Api
  module V1
    class NotificationsController < ApplicationController
      before_action :authenticate_user!
      before_action :set_notification, only: [:show, :mark_as_read, :mark_as_unread, :destroy]

      # GET /api/v1/notifications
      def index
        @notifications = current_user.notifications.recent

        # Lọc theo trạng thái đọc/chưa đọc
        if params[:read].present?
          @notifications = params[:read] == 'true' ? @notifications.read : @notifications.unread
        end

        # Lọc theo loại thông báo
        @notifications = @notifications.by_type(params[:type]) if params[:type].present?

        # Phân trang
        @notifications = @notifications.page(params[:page] || 1).per(params[:per_page] || 10)

        render json: {
          notifications: @notifications,
          meta: {
            total_count: @notifications.total_count,
            total_pages: @notifications.total_pages,
            current_page: @notifications.current_page,
            unread_count: current_user.notifications.unread.count
          }
        }
      end

      # GET /api/v1/notifications/:id
      def show
        render json: @notification
      end

      # POST /api/v1/notifications/:id/mark_as_read
      def mark_as_read
        if @notification.mark_as_read!
          render json: @notification
        else
          render json: { errors: @notification.errors }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/notifications/:id/mark_as_unread
      def mark_as_unread
        if @notification.mark_as_unread!
          render json: @notification
        else
          render json: { errors: @notification.errors }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/notifications/mark_all_as_read
      def mark_all_as_read
        count = NotificationService.mark_all_as_read(current_user)
        render json: { success: true, message: "All notifications marked as read", count: count }
      end

      # DELETE /api/v1/notifications/:id
      def destroy
        @notification.destroy
        head :no_content
      end

      # DELETE /api/v1/notifications/clear_all
      def clear_all
        current_user.notifications.destroy_all
        render json: { success: true, message: "All notifications cleared" }
      end

      # GET /api/v1/notifications/unread_count
      def unread_count
        count = current_user.notifications.unread.count
        render json: { count: count }
      end

      private

      def set_notification
        @notification = current_user.notifications.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Notification not found" }, status: :not_found
      end
    end
  end
end
