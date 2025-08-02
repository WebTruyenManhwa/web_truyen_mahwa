# frozen_string_literal: true

module Resolvers
  class MangasResolver < BaseResolver
    type [Types::MangaType], null: false
    
    argument :page, Integer, required: false, default_value: 1
    argument :per_page, Integer, required: false, default_value: 20
    argument :query, String, required: false
    argument :genre_ids, [ID], required: false
    argument :status, String, required: false
    argument :sort_by, String, required: false
    
    def resolve(page: 1, per_page: 20, query: nil, genre_ids: nil, status: nil, sort_by: nil)
      # Sử dụng lại logic từ MangaService
      mangas = MangaService.fetch_mangas({
        page: page,
        per_page: per_page,
        q: query,
        genre_ids: genre_ids,
        status: status,
        sort: sort_by
      })
      
      # Phân trang
      mangas.page(page).per(per_page)
    end
  end
end
