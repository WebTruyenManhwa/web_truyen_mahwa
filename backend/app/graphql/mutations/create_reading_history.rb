# frozen_string_literal: true

module Mutations
  class CreateReadingHistory < BaseMutation
    argument :manga_id, ID, required: true
    argument :chapter_id, ID, required: true
    
    field :reading_history, Types::ReadingHistoryType, null: true
    field :errors, [String], null: false
    
    def resolve(manga_id:, chapter_id:)
      authenticate_user!
      
      manga = Manga.find(manga_id)
      chapter = Chapter.find(chapter_id)
      
      # Tìm hoặc tạo mới reading_history
      reading_history = ReadingHistory.find_or_initialize_by(
        user: current_user,
        manga: manga,
        chapter: chapter
      )
      
      # Cập nhật thời gian đọc
      reading_history.touch
      
      if reading_history.save
        { reading_history: reading_history, errors: [] }
      else
        { reading_history: nil, errors: reading_history.errors.full_messages }
      end
    end
  end
end
