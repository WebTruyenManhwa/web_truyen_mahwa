module Types
  class MutationType < Types::BaseObject
    # Favorites
    field :toggle_favorite, mutation: Mutations::ToggleFavorite
    
    # Reading History
    field :create_reading_history, mutation: Mutations::CreateReadingHistory
    
    # Comments
    field :create_comment, mutation: Mutations::CreateComment
  end
end
