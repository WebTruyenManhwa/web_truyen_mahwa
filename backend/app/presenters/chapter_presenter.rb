class ChapterPresenter
  attr_reader :chapter

  def initialize(chapter)
    @chapter = chapter
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
    {
      id: chapter.manga.id,
      title: chapter.manga.title,
      slug: chapter.manga.slug
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

  def next_chapter_data
    # Use the optimized service instead of direct queries
    ChapterPresenterService.next_chapter_data(chapter)
  end

  def prev_chapter_data
    # Use the optimized service instead of direct queries
    ChapterPresenterService.prev_chapter_data(chapter)
  end
end
