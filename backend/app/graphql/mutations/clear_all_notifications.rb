# frozen_string_literal: true

module Mutations
  class ClearAllNotifications < BaseMutation
    # Fields
    field :success, Boolean, null: false
    field :errors, [String], null: false

    def resolve
      authenticate_user!

      begin
        current_user.notifications.destroy_all

        {
          success: true,
          errors: []
        }
      rescue => e
        Rails.logger.error("Error clearing all notifications: #{e.message}")

        {
          success: false,
          errors: [e.message]
        }
      end
    end
  end
end
