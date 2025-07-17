class ChapterSerializer < ActiveModel::Serializer
  attributes :id, :title, :number, :view_count, :created_at, :updated_at, :next_chapter, :prev_chapter, :manga, :images, :slug
  has_one :chapter_image_collection

  def next_chapter
    # Try using ChapterPresenterService first, which uses preloaded data
    next_chapter_data = ChapterPresenterService.next_chapter_data(object)
    return next_chapter_data if next_chapter_data

    # Fallback to using preloaded chapters from instance_options
    if instance_options[:chapters_by_manga] && instance_options[:chapters_by_manga][object.manga_id]
      chapters = instance_options[:chapters_by_manga][object.manga_id]
      # Ensure chapters are sorted by number
      sorted_chapters = chapters.sort_by { |c| c.number.to_f }
      # Find current chapter's index in the sorted array
      current_index = sorted_chapters.index { |c| c.id == object.id }

      if current_index && current_index < sorted_chapters.length - 1
        next_chap = sorted_chapters[current_index + 1]
        return { id: next_chap.id, number: next_chap.number, slug: next_chap.slug }
      else
        return nil
      end
    end

    # Fallback: Truy vấn database nếu không có preload data
    Rails.logger.warn "N+1 Query Warning: next_chapter lookup for chapter #{object.id} without preloaded data"
    next_chap = object.manga.chapters.where("number > ?", object.number).order(number: :asc).first
    next_chap ? { id: next_chap.id, number: next_chap.number, slug: next_chap.slug } : nil
  end

  def prev_chapter
    # Try using ChapterPresenterService first, which uses preloaded data
    prev_chapter_data = ChapterPresenterService.prev_chapter_data(object)
    return prev_chapter_data if prev_chapter_data

    # Fallback to using preloaded chapters from instance_options
    if instance_options[:chapters_by_manga] && instance_options[:chapters_by_manga][object.manga_id]
      chapters = instance_options[:chapters_by_manga][object.manga_id]
      # Ensure chapters are sorted by number
      sorted_chapters = chapters.sort_by { |c| c.number.to_f }
      # Find current chapter's index in the sorted array
      current_index = sorted_chapters.index { |c| c.id == object.id }

      if current_index && current_index > 0
        prev_chap = sorted_chapters[current_index - 1]
        return { id: prev_chap.id, number: prev_chap.number, slug: prev_chap.slug }
      else
        return nil
      end
    end

    # Fallback: Truy vấn database nếu không có preload data
    Rails.logger.warn "N+1 Query Warning: prev_chapter lookup for chapter #{object.id} without preloaded data"
    prev_chap = object.manga.chapters.where("number < ?", object.number).order(number: :desc).first
    prev_chap ? { id: prev_chap.id, number: prev_chap.number, slug: prev_chap.slug } : nil
  end

  def manga
    # Make sure we're using the preloaded manga association
    return nil unless object.association(:manga).loaded? || object.manga_id

    # Use the preloaded manga object if available
    manga_obj = object.manga

    # Return basic manga data
    {
      id: manga_obj.id,
      title: manga_obj.title,
      slug: manga_obj.slug
    }
  end

  def images
    # First check if images are already memoized in the object
    return object.instance_variable_get(:@images) if object.instance_variable_defined?(:@images)

    # Check if the chapter_image_collection association is already loaded
    if object.association(:chapter_image_collection).loaded?
      # If the association is loaded, use it directly
      return object.images
    end

    # Use images from preloaded data if available
    if instance_options[:images_by_chapter] && instance_options[:images_by_chapter][object.id]
      return instance_options[:images_by_chapter][object.id]
    end

    # Fallback: Truy vấn database nếu không có preload data
    Rails.logger.warn "N+1 Query Warning: images lookup for chapter #{object.id} without preloaded data"
    object.images
  end
end
