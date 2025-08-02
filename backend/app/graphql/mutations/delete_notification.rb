# frozen_string_literal: true

module Mutations
  class DeleteNotification < BaseMutation
    # Arguments
    argument :id, ID, required: true

    # Fields
    field :success, Boolean, null: false
    field :errors, [String], null: false

    def resolve(id:)
      authenticate_user!

      notification = current_user.notifications.find_by(id: id)

      if notification.nil?
        return {
          success: false,
          errors: ["Notification not found"]
        }
      end

      if notification.destroy
        {
          success: true,
          errors: []
        }
      else
        {
          success: false,
          errors: notification.errors.full_messages
        }
      end
    end
  end
end
