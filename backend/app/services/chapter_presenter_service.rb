class ChapterPresenterService
  # Cache for storing preloaded data during a request
  class << self
    def reset_request_cache
      @chapters_by_manga = {}
      @next_prev_map = {}
      @image_collections = {}
    end

    # Check if chapters are preloaded for a manga
    def has_chapters_for_manga?(manga_id)
      @chapters_by_manga&.key?(manga_id)
    end

    # Get preloaded chapters for a manga
    def chapters_by_manga(manga_id)
      @chapters_by_manga&.dig(manga_id)
    end

    # Preload all chapters for a manga and create a next/prev mapping
    def preload_chapters_for_manga(manga_id)
      @chapters_by_manga ||= {}
      @next_prev_map ||= {}

      # Return cached result if available
      return @chapters_by_manga[manga_id] if @chapters_by_manga[manga_id]

      # Load all chapters for this manga in one query - no transaction needed for read-only operation
      chapters = Chapter.where(manga_id: manga_id).order(number: :asc).to_a
      @chapters_by_manga[manga_id] = chapters

      # Create next/prev mapping
      @next_prev_map[manga_id] = {}

      # Process chapters to create next/prev mapping
      chapters.each_with_index do |chapter, index|
        @next_prev_map[manga_id][chapter.id] = {
          prev: index > 0 ? chapters[index - 1] : nil,
          next: index < chapters.length - 1 ? chapters[index + 1] : nil
        }
      end

      chapters
    end

    # Get next chapter data for a specific chapter
    def next_chapter_data(chapter)
      manga_id = chapter.manga_id

      # Ensure chapters are preloaded
      preload_chapters_for_manga(manga_id) unless @next_prev_map&.dig(manga_id)

      next_chapter = @next_prev_map.dig(manga_id, chapter.id, :next)
      next_chapter ? { id: next_chapter.id, number: next_chapter.number, slug: next_chapter.slug } : nil
    end

    # Get previous chapter data for a specific chapter
    def prev_chapter_data(chapter)
      manga_id = chapter.manga_id

      # Ensure chapters are preloaded
      preload_chapters_for_manga(manga_id) unless @next_prev_map&.dig(manga_id)

      prev_chapter = @next_prev_map.dig(manga_id, chapter.id, :prev)
      prev_chapter ? { id: prev_chapter.id, number: prev_chapter.number, slug: prev_chapter.slug } : nil
    end

    # Preload image collections for multiple chapters
    def preload_image_collections(chapter_ids)
      return {} if chapter_ids.empty?

      @image_collections ||= {}

      # Filter out chapter IDs that are already cached
      missing_ids = chapter_ids.reject { |id| @image_collections.key?(id) }

      # If there are missing IDs, load them all at once
      unless missing_ids.empty?
        # Use a single query to load all collections
        collections = ChapterImageCollection.where(chapter_id: missing_ids).to_a

        # Add each collection to the cache
        collections.each do |collection|
          @image_collections[collection.chapter_id] = collection
        end

        # For any chapter that doesn't have a collection, set nil in the cache
        missing_ids.each do |id|
          @image_collections[id] ||= nil
        end
      end

      # Return a hash of chapter_id => collection
      chapter_ids.each_with_object({}) do |id, result|
        result[id] = @image_collections[id]
      end
    end
  end
end
