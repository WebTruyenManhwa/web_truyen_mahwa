class ReadingHistorySerializer < ActiveModel::Serializer
  attributes :id, :last_read_at

  belongs_to :manga
  belongs_to :chapter

  # Override the default association serialization to use preloaded data
  def chapter
    if instance_options[:chapters_by_manga] && instance_options[:images_by_chapter]
      # Use the preloaded chapter from the object
      chapter_obj = object.chapter

      # Make sure we have the chapter
      return nil unless chapter_obj

      # Return the chapter data directly instead of using the serializer class
      {
        id: chapter_obj.id,
        title: chapter_obj.title,
        number: chapter_obj.number,
        slug: chapter_obj.slug,
        view_count: chapter_obj.view_count,
        created_at: chapter_obj.created_at,
        updated_at: chapter_obj.updated_at,
        next_chapter: next_chapter_data(chapter_obj),
        prev_chapter: prev_chapter_data(chapter_obj),
        manga: {
          id: chapter_obj.manga.id,
          title: chapter_obj.manga.title,
          slug: chapter_obj.manga.slug
        }
      }
    else
      # Fall back to default behavior if preloaded data not available
      super
    end
  end

  # Helper method to get next chapter data
  def next_chapter_data(chapter_obj)
    if instance_options[:chapters_by_manga] && instance_options[:chapters_by_manga][chapter_obj.manga_id]
      chapters = instance_options[:chapters_by_manga][chapter_obj.manga_id]
      # Ensure chapters are sorted by number
      sorted_chapters = chapters.sort_by { |c| c.number.to_f }
      # Find current chapter's index in the sorted array
      current_index = sorted_chapters.index { |c| c.id == chapter_obj.id }

      if current_index && current_index < sorted_chapters.length - 1
        next_chap = sorted_chapters[current_index + 1]
        return { id: next_chap.id, number: next_chap.number, slug: next_chap.slug }
      end
    end
    nil
  end

  # Helper method to get previous chapter data
  def prev_chapter_data(chapter_obj)
    if instance_options[:chapters_by_manga] && instance_options[:chapters_by_manga][chapter_obj.manga_id]
      chapters = instance_options[:chapters_by_manga][chapter_obj.manga_id]
      # Ensure chapters are sorted by number
      sorted_chapters = chapters.sort_by { |c| c.number.to_f }
      # Find current chapter's index in the sorted array
      current_index = sorted_chapters.index { |c| c.id == chapter_obj.id }

      if current_index && current_index > 0
        prev_chap = sorted_chapters[current_index - 1]
        return { id: prev_chap.id, number: prev_chap.number, slug: prev_chap.slug }
      end
    end
    nil
  end

  # Override the default association serialization to use preloaded data
  def manga
    # Use the preloaded manga from the object if available
    return nil unless object.manga

    # Return basic manga data to avoid additional queries
    {
      id: object.manga.id,
      title: object.manga.title,
      slug: object.manga.slug
    }
  end
end
