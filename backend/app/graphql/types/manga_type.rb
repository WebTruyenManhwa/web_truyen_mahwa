# frozen_string_literal: true

module Types
  class MangaType < Types::BaseObject
    field :id, ID, null: false
    field :title, String, null: false
    field :description, String
    field :cover_image, String
    field :status, String
    field :author, String
    field :artist, String
    field :release_year, Integer
    field :rating, Float
    field :total_votes, Integer
    field :view_count, Integer
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
    field :updated_at, GraphQL::Types::ISO8601DateTime, null: false

    # Associations
    field :genres, [Types::GenreType], null: false
    field :chapters, [Types::ChapterType], null: false
    field :latest_chapter, Types::ChapterType, null: true
    field :chapters_count, Integer, null: false

    def genres
      if object.is_a?(Hash)
        # Nếu object là một Hash, có thể nó đã có trường genres
        object[:genres] || object['genres'] || []
      elsif object.respond_to?(:id)
        # Nếu object có phương thức id, sử dụng batch loading
        Loaders::AssociationLoader.for(Manga, :genres).load(object.id)
      else
        # Trường hợp khác, trả về mảng rỗng
        []
      end
    end

    def chapters
      if object.is_a?(Hash)
        # Nếu object là một Hash, có thể nó đã có trường chapters
        object[:chapters] || object['chapters'] || []
      elsif object.respond_to?(:id)
        # Nếu object có phương thức id, sử dụng batch loading
        Loaders::AssociationLoader.for(Manga, :chapters).load(object.id)
      else
        # Trường hợp khác, trả về mảng rỗng
        []
      end
    end

    def latest_chapter
      Rails.logger.info "DEBUG latest_chapter - object class: #{object.class.name}"
      Rails.logger.info "DEBUG latest_chapter - object: #{object.inspect}"

      if object.is_a?(Hash) && object['latestChapter'].present?
        Rails.logger.info "DEBUG latest_chapter - using latestChapter from hash"
        return object['latestChapter']
      elsif object.is_a?(Hash) && object['latest_chapter'].present?
        Rails.logger.info "DEBUG latest_chapter - using latest_chapter from hash"
        return object['latest_chapter']
      elsif object.respond_to?(:latest_chapter) && object.latest_chapter.present?
        Rails.logger.info "DEBUG latest_chapter - using object.latest_chapter"
        return object.latest_chapter
      elsif object.respond_to?(:chapters) && object.chapters.present?
        # Nếu có chapters, tìm chapter có number lớn nhất
        Rails.logger.info "DEBUG latest_chapter - finding max from chapters"
        return object.chapters.max_by(&:number)
      else
        # Nếu không có cách nào lấy được latest_chapter, trả về nil
        Rails.logger.info "DEBUG latest_chapter - returning nil"
        return nil
      end
    end

    def chapters_count
      if object.is_a?(Hash) && object['chapters_count'].present?
        object['chapters_count']
      elsif object.respond_to?(:chapters_count) && !object.chapters_count.nil?
        object.chapters_count
      elsif object.respond_to?(:chapters) && object.chapters.present?
        # Nếu có chapters, đếm số lượng
        object.chapters.size
      else
        # Nếu không có cách nào lấy được chapters_count, trả về 0
        0
      end
    end
  end
end
