# frozen_string_literal: true

module Types
  class FavoriteType < Types::BaseObject
    field :id, ID, null: false
    field :user_id, ID, null: false
    field :manga_id, ID, null: false
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
    field :updated_at, GraphQL::Types::ISO8601DateTime, null: false
    
    # Associations
    field :manga, Types::MangaType, null: false
    field :user, Types::UserType, null: false
  end
end
