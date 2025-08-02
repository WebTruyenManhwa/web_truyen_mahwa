# frozen_string_literal: true

module Types
  class UserType < Types::BaseObject
    field :id, ID, null: false
    field :email, String, null: false
    field :username, String, null: true
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
    field :updated_at, GraphQL::Types::ISO8601DateTime, null: false
    
    # Chỉ trả về các trường nhạy cảm nếu là chính user đó hoặc admin
    field :role, String, null: true
    
    # Associations
    field :favorites, [Types::FavoriteType], null: false
    field :reading_histories, [Types::ReadingHistoryType], null: false
    
    def role
      if context[:current_user] && (context[:current_user].id == object.id || context[:current_user].admin?)
        object.role
      end
    end
    
    def favorites
      if context[:current_user] && context[:current_user].id == object.id
        object.favorites
      else
        []
      end
    end
    
    def reading_histories
      if context[:current_user] && context[:current_user].id == object.id
        object.reading_histories
      else
        []
      end
    end
  end
end
