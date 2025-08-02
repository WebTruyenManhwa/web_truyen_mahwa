module Resolvers
  class ChapterResolver < BaseResolver
    type Types::ChapterType, null: true

    argument :id, ID, required: false
    argument :manga_id, ID, required: false
    argument :number, Float, required: false

    def resolve(id: nil, manga_id: nil, number: nil)
      if id
        Chapter.find(id)
      elsif manga_id && number
        manga = Manga.find(manga_id)
        manga.chapters.find_by(number: number)
      else
        raise GraphQL::ExecutionError, "Phải cung cấp id hoặc manga_id và number"
      end
    end
  end
end
