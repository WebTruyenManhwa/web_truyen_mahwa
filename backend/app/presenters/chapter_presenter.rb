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
      images: formatted_images,
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
  
  def formatted_images
    return [] unless chapter.chapter_image_collection
    
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
    next_chap = chapter.manga.chapters.where("number > ?", chapter.number).order(number: :asc).first
    next_chap ? { id: next_chap.id, number: next_chap.number, slug: next_chap.slug } : nil
  end
  
  def prev_chapter_data
    prev_chap = chapter.manga.chapters.where("number < ?", chapter.number).order(number: :desc).first
    prev_chap ? { id: prev_chap.id, number: prev_chap.number, slug: prev_chap.slug } : nil
  end
end 