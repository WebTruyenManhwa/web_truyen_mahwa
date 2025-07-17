class ChapterPresenter
  attr_reader :chapter

  def initialize(chapter)
    @chapter = chapter
    # Preload chapters để tránh N+1 query
    @all_chapters = nil
  end

  def as_json(options = {})
    {
      id: chapter.id,
      title: chapter.title,
      number: chapter.number,
      view_count: chapter.view_count,
      created_at: chapter.created_at,
      updated_at: chapter.updated_at,
      manga: manga_data,
      images: formatted_images(options),
      next_chapter: next_chapter_data,
      prev_chapter: prev_chapter_data,
      slug: chapter.slug
    }
  end

  private

  def manga_data
    # Avoid N+1 query by using the already loaded manga association
    manga = chapter.manga
    {
      id: manga.id,
      title: manga.title,
      slug: manga.slug
    }
  end

  def formatted_images(options = {})
    # Get the chapter's image collection from the preloaded cache if available
    image_collection = chapter.chapter_image_collection

    # Return empty array if no image collection exists
    return [] unless image_collection

    # For list views, we may only need the first image
    if options[:list_view]
      first_img = chapter.images.first
      return [] unless first_img

      return [{
        position: first_img['position'],
        url: image_url(first_img),
        is_external: first_img['is_external']
      }]
    end

    # For full chapter view, return all images
    chapter.images.map do |img|
      {
        position: img['position'],
        url: image_url(img),
        is_external: img['is_external']
      }
    end
  end

  def image_url(img)
    if img['is_external']
      img['external_url']
    else
      # Sử dụng CarrierWave để lấy URL
      uploader = ChapterImageUploader.new
      uploader.retrieve_from_store!(img['image'])
      uploader.url
    end
  rescue => e
    Rails.logger.error "Lỗi khi lấy URL ảnh: #{e.message}"
    # Fallback URL nếu có lỗi
    "/images/fallback/chapter_image.jpg"
  end

  def all_chapters
    # Use the ChapterPresenterService for preloaded chapters if available
    # This avoids repeated database queries
    return ChapterPresenterService.chapters_by_manga(chapter.manga_id) if ChapterPresenterService.has_chapters_for_manga?(chapter.manga_id)

    # Otherwise, memoize the result locally
    @all_chapters ||= begin
      # Kiểm tra xem manga đã được preload chapters chưa
      if chapter.manga.association(:chapters).loaded?
        chapter.manga.chapters.to_a
      else
        # Nếu chưa, thực hiện preload và cache lại kết quả
        Chapter.where(manga_id: chapter.manga_id).to_a
      end
    end
  end

  def next_chapter_data
    # Try to use the ChapterPresenterService first
    service_data = ChapterPresenterService.next_chapter_data(chapter)
    return service_data if service_data

    # Fallback to local calculation if service data is not available
    next_chap = all_chapters.select { |c| c.number > chapter.number }
                            .min_by(&:number)
    next_chap ? { id: next_chap.id, number: next_chap.number, slug: next_chap.slug } : nil
  end

  def prev_chapter_data
    # Try to use the ChapterPresenterService first
    service_data = ChapterPresenterService.prev_chapter_data(chapter)
    return service_data if service_data

    # Fallback to local calculation if service data is not available
    prev_chap = all_chapters.select { |c| c.number < chapter.number }
                            .max_by(&:number)
    prev_chap ? { id: prev_chap.id, number: prev_chap.number, slug: prev_chap.slug } : nil
  end
end
