# frozen_string_literal: true

module Types
  class ReadingHistoryType < Types::BaseObject
    field :id, ID, null: false
    field :user, Types::UserType, null: false
    field :manga, Types::MangaType, null: false
    field :chapter, Types::ChapterType, null: false
    field :last_read_at, GraphQL::Types::ISO8601DateTime, null: false
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
    field :updated_at, GraphQL::Types::ISO8601DateTime, null: false

    def user
      Loaders::RecordLoader.for(User).load(object.user_id)
    end

    def manga
      Loaders::RecordLoader.for(Manga).load(object.manga_id)
    end

    def chapter
      Loaders::RecordLoader.for(Chapter).load(object.chapter_id)
    end
  end
end
