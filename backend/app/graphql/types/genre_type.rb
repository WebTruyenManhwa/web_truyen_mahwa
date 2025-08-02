# frozen_string_literal: true

module Types
  class GenreType < Types::BaseObject
    field :id, ID, null: false
    field :name, String, null: false
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
    field :updated_at, GraphQL::Types::ISO8601DateTime, null: false
    
    # Associations
    field :mangas_count, Integer, null: false
    
    def mangas_count
      object.mangas.count
    end
  end
end
