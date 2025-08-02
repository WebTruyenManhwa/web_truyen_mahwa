# frozen_string_literal: true

module Types
  class ChapterType < Types::BaseObject
    field :id, ID, null: false
    field :number, Float, null: false
    field :title, String
    field :manga, Types::MangaType, null: false
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
    field :updated_at, GraphQL::Types::ISO8601DateTime, null: false
    field :images, [String], null: false
    field :next_chapter, Types::ChapterType, null: true
    field :prev_chapter, Types::ChapterType, null: true

    def manga
      Loaders::RecordLoader.for(Manga).load(object.manga_id)
    end

    def images
      # Giả sử images được lưu dưới dạng JSON trong cơ sở dữ liệu
      object.images || []
    end

    def next_chapter
      manga.then do |manga_obj|
        Loaders::AssociationLoader.for(Manga, :chapters).load(manga_obj.id).then do |chapters|
          chapters.find { |c| c.number > object.number && c.number == chapters.select { |ch| ch.number > object.number }.map(&:number).min }
        end
      end
    end

    def prev_chapter
      manga.then do |manga_obj|
        Loaders::AssociationLoader.for(Manga, :chapters).load(manga_obj.id).then do |chapters|
          chapters.find { |c| c.number < object.number && c.number == chapters.select { |ch| ch.number < object.number }.map(&:number).max }
        end
      end
    end
  end
end
