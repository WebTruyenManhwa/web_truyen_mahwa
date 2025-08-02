# frozen_string_literal: true

module Types
  class WebTruyenQueryType < Types::BaseObject
    description "Root query type for WebTruyenMahwa"

    # Manga queries
    field :manga, Types::MangaType, null: true do
      description "Tìm một manga theo ID"
      argument :id, ID, required: true
    end

    def manga(id:)
      manga = Manga.find(id)
      MangaService.increment_view_count(manga, context[:request]&.remote_ip) if context[:request]
      manga
    end

    field :mangas, [Types::MangaType], null: false do
      description "Danh sách manga với phân trang và lọc"
      argument :page, Integer, required: false, default_value: 1
      argument :per_page, Integer, required: false, default_value: 20
      argument :sort_by, String, required: false, default_value: "created_at"
      argument :sort_direction, String, required: false, default_value: "desc"
      argument :filter_by_genre, [ID], required: false
      argument :filter_by_status, String, required: false
      argument :search, String, required: false
    end

    def mangas(page: 1, per_page: 20, sort_by: "created_at", sort_direction: "desc", filter_by_genre: nil, filter_by_status: nil, search: nil)
      per_page = [per_page.to_i, 100].min
      page = [page.to_i, 1].max

      query = Manga.all

      # Apply filters
      if filter_by_genre.present?
        query = query.joins(:genres).where(genres: { id: filter_by_genre }).distinct
      end

      if filter_by_status.present?
        query = query.where(status: filter_by_status)
      end

      if search.present?
        query = query.where("title ILIKE ? OR description ILIKE ?", "%#{search}%", "%#{search}%")
      end

      # Apply sorting
      case sort_by
      when "popularity", "view_count"
        query = query.order(view_count: sort_direction == "asc" ? :asc : :desc)
      when "updatedAt", "updated_at"
        query = query.order(updated_at: sort_direction == "asc" ? :asc : :desc)
      when "createdAt", "created_at"
        query = query.order(created_at: sort_direction == "asc" ? :asc : :desc)
      when "title"
        query = query.order(title: sort_direction == "asc" ? :asc : :desc)
      else
        query = query.order(created_at: :desc)
      end

      # Paginate
      query.page(page).per(per_page)
    end

    # Ranking queries
    field :rankings, [Types::MangaType], null: false do
      description "Bảng xếp hạng manga theo ngày/tuần/tháng"
      argument :period, String, required: false, default_value: "day"
      argument :limit, Integer, required: false, default_value: 10
    end

    def rankings(period: "day", limit: 10)
      limit = [limit.to_i, 20].min
      period_sym = period.to_sym
      MangaService.get_rankings(period_sym, limit)
    end

    # Chapter queries
    field :chapter, Types::ChapterType, null: true do
      description "Tìm một chapter theo ID"
      argument :id, ID, required: true
    end

    def chapter(id:)
      chapter = Chapter.find(id)
      if context[:request]
        visitor_ip = context[:request].remote_ip
        chapter_key = "view_count:chapter:#{chapter.id}:#{visitor_ip}:#{Time.current.to_i / 1800}"
        unless Rails.cache.exist?(chapter_key)
          chapter.increment!(:view_count)
          Rails.cache.write(chapter_key, true, expires_in: 30.minutes)
        end
        manga_key = "view_count:manga_from_chapter:#{chapter.manga_id}:#{chapter.id}:#{visitor_ip}"
        unless Rails.cache.exist?(manga_key)
          chapter.manga.track_view
          Rails.cache.write(manga_key, true, expires_in: 30.minutes)
        end
      end
      chapter
    end

    # User queries
    field :current_user, Types::UserType, null: true do
      description "Lấy thông tin người dùng hiện tại"
    end

    def current_user
      context[:current_user]
    end

    # Reading history queries
    field :reading_histories, [Types::ReadingHistoryType], null: false do
      description "Lấy lịch sử đọc của người dùng hiện tại"
      argument :limit, Integer, required: false, default_value: 50
    end

    def reading_histories(limit: 50)
      return [] unless context[:current_user]
      limit = [limit.to_i, 100].min
      context[:current_user].reading_histories
        .select('DISTINCT ON (manga_id) *')
        .order('manga_id, last_read_at DESC')
        .limit(limit)
    end

    # Genre queries
    field :genres, [Types::GenreType], null: false do
      description "Danh sách tất cả thể loại"
    end

    def genres
      Genre.all
    end

    # Notifications queries
    field :notifications, [Types::NotificationType], null: false do
      description "Lấy danh sách thông báo của người dùng hiện tại"
      argument :page, Integer, required: false, default_value: 1
      argument :per_page, Integer, required: false, default_value: 20
      argument :read, Boolean, required: false
    end

    def notifications(page: 1, per_page: 20, read: nil)
      return [] unless context[:current_user]

      per_page = [per_page.to_i, 100].min
      query = context[:current_user].notifications.order(created_at: :desc)

      # Filter by read status if specified
      query = query.where(read: read) unless read.nil?

      query.page(page).per(per_page)
    end

    field :unread_notifications_count, Integer, null: false do
      description "Lấy số lượng thông báo chưa đọc của người dùng hiện tại"
    end

    def unread_notifications_count
      return 0 unless context[:current_user]
      context[:current_user].notifications.where(read: false).count
    end
  end
end

