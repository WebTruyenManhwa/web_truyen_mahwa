class ChapterService
  class << self
    # Cache for preloaded chapters to avoid duplicate queries in the same request
    def reset_request_cache
      @chapters_cache = {}
      @images_cache = {}
    end

    # Preload chapters for multiple mangas in a single query
    def preload_chapters_for_mangas(manga_ids)
      return {} if manga_ids.blank?

      # Initialize cache if needed
      @chapters_cache ||= {}

      # Create a cache key for this specific set of manga_ids
      cache_key = manga_ids.sort.join('-')

      # Return cached result if available
      return @chapters_cache[cache_key] if @chapters_cache[cache_key]

      # Ensure manga_ids are integers
      manga_ids = manga_ids.map(&:to_i).uniq

      # Fetch all chapters for these mangas in one query with proper includes
      chapters = Chapter.includes(:chapter_image_collection)
                        .where(manga_id: manga_ids)
                        .order('manga_id, number::decimal ASC')
                        .to_a

      # Group chapters by manga_id
      chapters_by_manga = chapters.group_by(&:manga_id)

      # Cache the result
      @chapters_cache[cache_key] = chapters_by_manga

      chapters_by_manga
    end

    # Preload images for multiple chapters in a single query
    def preload_images_for_chapters(chapter_ids)
      return {} if chapter_ids.blank?

      # Initialize cache if needed
      @images_cache ||= {}

      # Create a cache key for this specific set of chapter_ids
      cache_key = chapter_ids.sort.join('-')

      # Return cached result if available
      return @images_cache[cache_key] if @images_cache[cache_key]

      # Ensure chapter_ids are integers
      chapter_ids = chapter_ids.map(&:to_i).uniq

      # Fetch all chapter image collections in one query
      collections = ChapterImageCollection.where(chapter_id: chapter_ids)
                                         .to_a

      # Create a map of chapter_id to images
      images_by_chapter = {}
      collections.each do |collection|
        images_by_chapter[collection.chapter_id] = collection.images if collection.present?
      end

      # Cache the result
      @images_cache[cache_key] = images_by_chapter

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
