# frozen_string_literal: true

module Types
  class NotificationType < Types::BaseObject
    field :id, ID, null: false
    field :user_id, Integer, null: false
    field :title, String, null: false
    field :content, String, null: true
    field :notification_type, String, null: false
    field :read, Boolean, null: false
    field :target_url, String, null: true
    field :target_id, ID, null: true
    field :target_type, String, null: true
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
    field :updated_at, GraphQL::Types::ISO8601DateTime, null: false

    # Associations
    field :user, Types::UserType, null: false

    # Resolve user association
    def user
      Loaders::RecordLoader.for(User).load(object.user_id)
    end
  end
end
