class ChapterService
  class << self
    # Preload chapters for multiple mangas in a single query
    def preload_chapters_for_mangas(manga_ids)
      return {} if manga_ids.blank?

      # Ensure manga_ids are integers
      manga_ids = manga_ids.map(&:to_i).uniq

      # Fetch all chapters for these mangas in one query with proper includes
      chapters = Chapter.includes(:chapter_image_collection, :manga)
                        .where(manga_id: manga_ids)
                        .order('manga_id, number::decimal ASC')

      # Group chapters by manga_id
      chapters_by_manga = chapters.group_by(&:manga_id)

      chapters_by_manga
    end

    # Preload images for multiple chapters in a single query
    def preload_images_for_chapters(chapter_ids)
      return {} if chapter_ids.blank?

      # Ensure chapter_ids are integers
      chapter_ids = chapter_ids.map(&:to_i).uniq

      # Fetch all chapter image collections in one query
      collections = ChapterImageCollection.where(chapter_id: chapter_ids)
                                         .includes(:chapter)

      # Create a map of chapter_id to images
      images_by_chapter = {}
      collections.each do |collection|
        images_by_chapter[collection.chapter_id] = collection.images if collection.present?
      end

      images_by_chapter
    end

    # Increment view count for a chapter
    def increment_view_count(chapter, remote_ip)
      # Use a rate limiter to prevent abuse (e.g., one view per IP per hour)
      cache_key = "chapter_view:#{chapter.id}:#{remote_ip}"
      return if Rails.cache.exist?(cache_key)

      # Set a cache entry to limit the rate
      Rails.cache.write(cache_key, 1, expires_in: 1.hour)

      # Increment the view count
      chapter.increment!(:view_count)

      # Also increment the manga's view count and add to manga_views
      chapter.manga.increment!(:view_count)
      MangaView.create(manga_id: chapter.manga_id, view_count: 1)
    end
  end
end
