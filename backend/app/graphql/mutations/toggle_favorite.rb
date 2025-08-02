# frozen_string_literal: true

module Mutations
  class ToggleFavorite < BaseMutation
    argument :manga_id, ID, required: true
    
    field :is_favorite, Boolean, null: false
    field :errors, [String], null: false
    
    def resolve(manga_id:)
      authenticate_user!
      
      manga = Manga.find(manga_id)
      favorite = Favorite.find_by(user: current_user, manga: manga)
      
      if favorite
        favorite.destroy
        { is_favorite: false, errors: [] }
      else
        favorite = Favorite.new(user: current_user, manga: manga)
        if favorite.save
          { is_favorite: true, errors: [] }
        else
          { is_favorite: false, errors: favorite.errors.full_messages }
        end
      end
    end
  end
end
