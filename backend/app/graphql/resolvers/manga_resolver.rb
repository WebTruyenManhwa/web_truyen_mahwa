module Resolvers
  class MangaResolver < BaseResolver
    type Types::MangaType, null: true

    argument :id, ID, required: false
    argument :slug, String, required: false

    def resolve(id: nil, slug: nil)
      if id
        Manga.find(id)
      elsif slug
        Manga.find_by(slug: slug)
      else
        raise GraphQL::ExecutionError, "Phải cung cấp id hoặc slug"
      end
    end
  end
end
