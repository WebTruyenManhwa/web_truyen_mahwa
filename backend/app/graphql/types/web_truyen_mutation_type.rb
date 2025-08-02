# frozen_string_literal: true

module Types
  class WebTruyenMutationType < Types::BaseObject
    description "Root mutation type for WebTruyenMahwa"

    # Comment mutations
    field :create_comment, mutation: Mutations::CreateComment

    # Favorite mutations
    field :toggle_favorite, mutation: Mutations::ToggleFavorite

    # Reading History mutations
    field :create_reading_history, mutation: Mutations::CreateReadingHistory
    field :delete_reading_history, mutation: Mutations::DeleteReadingHistory
    field :delete_all_reading_histories, mutation: Mutations::DeleteAllReadingHistories
  end
end
