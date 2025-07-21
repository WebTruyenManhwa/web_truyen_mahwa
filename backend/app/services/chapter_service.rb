class ChapterService
  class << self
    # Cache for preloaded chapters to avoid duplicate queries in the same request
    def reset_request_cache
      @chapters_cache = {}
      @images_cache = {}
      @first_images_cache = {}
    end

    # Preload chapters for multiple mangas in a single query
    def preload_chapters_for_mangas(manga_ids)
      return {} if manga_ids.blank?

      # Initialize cache if needed
      @chapters_cache ||= {}

      # Giới hạn số lượng manga_ids để tránh truy vấn quá lớn
      if manga_ids.size > 50
        Rails.logger.warn "Large number of manga_ids (#{manga_ids.size}) in preload_chapters_for_mangas, limiting to 50"
        manga_ids = manga_ids.take(50)
      end

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

      # Giới hạn kích thước cache để tránh memory leak
      if @chapters_cache.size > 20
        Rails.logger.info "Clearing chapters_cache to prevent memory growth (size: #{@chapters_cache.size})"
        @chapters_cache = {}
      end

      # Cache the result
      @chapters_cache[cache_key] = chapters_by_manga

      chapters_by_manga
    end

    # Preload only first image for each chapter - optimized for list views
    def preload_first_images_for_chapters(chapter_ids)
      return {} if chapter_ids.blank?

      # Initialize cache if needed
      @first_images_cache ||= {}

      # Giới hạn số lượng chapter_ids để tránh truy vấn quá lớn
      if chapter_ids.size > 100
        Rails.logger.warn "Large number of chapter_ids (#{chapter_ids.size}) in preload_first_images_for_chapters, limiting to 100"
        chapter_ids = chapter_ids.take(100)
      end

      # Create a cache key for this specific set of chapter_ids
      cache_key = chapter_ids.sort.join('-')

      # Return cached result if available
      return @first_images_cache[cache_key] if @first_images_cache[cache_key]

      # Ensure chapter_ids are integers
      chapter_ids = chapter_ids.map(&:to_i).uniq

      # Use raw SQL to fetch only the first image for each chapter
      # This is much more efficient than loading all images and then filtering
      sql = <<-SQL
        SELECT DISTINCT ON (chapter_id) chapter_id, 
               images->0 as first_image
        FROM chapter_image_collections
        WHERE chapter_id IN (#{chapter_ids.join(',')})
        ORDER BY chapter_id
      SQL

      # Execute the query
      results = ActiveRecord::Base.connection.execute(sql)

      # Create a map of chapter_id to first image only
      first_images_by_chapter = {}
      results.each do |row|
        chapter_id = row['chapter_id'].to_i
        first_image = row['first_image']
        first_images_by_chapter[chapter_id] = [first_image] if first_image.present?
      end

      # Giới hạn kích thước cache để tránh memory leak
      if @first_images_cache.size > 20
        Rails.logger.info "Clearing first_images_cache to prevent memory growth (size: #{@first_images_cache.size})"
        @first_images_cache = {}
      end

      # Cache the result
      @first_images_cache[cache_key] = first_images_by_chapter

      first_images_by_chapter
    end

    # Preload images for multiple chapters in a single query
    def preload_images_for_chapters(chapter_ids)
      return {} if chapter_ids.blank?

      # Initialize cache if needed
      @images_cache ||= {}

      # Giới hạn số lượng chapter_ids để tránh truy vấn quá lớn
      if chapter_ids.size > 50
        Rails.logger.warn "Large number of chapter_ids (#{chapter_ids.size}) in preload_images_for_chapters, limiting to 50"
        chapter_ids = chapter_ids.take(50)
      end

      # Create a cache key for this specific set of chapter_ids
      cache_key = chapter_ids.sort.join('-')

      # Return cached result if available
      return @images_cache[cache_key] if @images_cache[cache_key]

      # Ensure chapter_ids are integers
      chapter_ids = chapter_ids.map(&:to_i).uniq

      # Fetch all chapter image collections in one query
      collections = ChapterImageCollection.where(chapter_id: chapter_ids)
                                         .select(:chapter_id, :images)
                                         .to_a

      # Create a map of chapter_id to images
      images_by_chapter = {}
      collections.each do |collection|
        images_by_chapter[collection.chapter_id] = collection.images if collection.present?
      end

      # Giới hạn kích thước cache để tránh memory leak
      if @images_cache.size > 10
        Rails.logger.info "Clearing images_cache to prevent memory growth (size: #{@images_cache.size})"
        @images_cache = {}
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
