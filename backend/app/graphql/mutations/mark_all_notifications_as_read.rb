# frozen_string_literal: true

module Mutations
  class MarkAllNotificationsAsRead < BaseMutation
    # Fields
    field :success, Boolean, null: false
    field :errors, [String], null: false

    def resolve
      authenticate_user!

      begin
        current_user.notifications.update_all(read: true)

        {
          success: true,
          errors: []
        }
      rescue => e
        Rails.logger.error("Error marking all notifications as read: #{e.message}")

        {
          success: false,
          errors: [e.message]
        }
      end
    end
  end
end
