class Chapter < ApplicationRecord
  belongs_to :manga

  # Associations
  has_one :chapter_image_collection, dependent: :destroy
  has_many :reading_histories, dependent: :destroy
  has_many :comments, as: :commentable, dependent: :destroy

  # Validations
  validates :number, presence: true, uniqueness: { scope: :manga_id }
  validates :slug, presence: true, allow_blank: true

  # Scopes
  scope :ordered, -> { order(number: :asc) }

  # Callbacks
  before_create :set_defaults
  before_save :set_slug
  after_create :update_manga_updated_at
  after_create :create_image_collection

  # Phương thức để lấy tất cả ảnh của chapter theo thứ tự vị trí
  def images
    # Return memoized result if available
    return @images if defined?(@images) && @images

    # Initialize with empty array if no collection exists
    @images = begin
      # Return empty array if no collection exists
      return [] unless chapter_image_collection

      # Use already loaded association if available to avoid a query
      collection = if association(:chapter_image_collection).loaded?
                     chapter_image_collection
                   else
                     # Only query if we need to
                     ChapterImageCollection.find_by(chapter_id: id)
                   end

      # Return empty array if no collection found
      return [] unless collection

      # Sort images by position
      collection.images.sort_by { |img| img['position'] }
    end
  end

  # Clear the memoized images when the collection is updated
  def clear_images_cache
    remove_instance_variable(:@images) if defined?(@images)
  end

  # Thêm ảnh mới vào chapter
  def add_image(image_data)
    ensure_image_collection
    result = chapter_image_collection.add_image(image_data)
    clear_images_cache
    result
  end

  # Cập nhật ảnh theo vị trí
  def update_image_at_position(position, image_data)
    return unless chapter_image_collection
    result = chapter_image_collection.update_image_at_position(position, image_data)
    clear_images_cache
    result
  end

  # Xóa ảnh theo vị trí
  def remove_image_at_position(position)
    return unless chapter_image_collection
    result = chapter_image_collection.remove_image_at_position(position)
    clear_images_cache
    result
  end

  # Sắp xếp lại vị trí các ảnh
  def reorder_images(position_mapping)
    return unless chapter_image_collection
    result = chapter_image_collection.reorder_images(position_mapping)
    clear_images_cache
    result
  end

  # Đảm bảo chapter có image collection
  def ensure_image_collection
    if chapter_image_collection.nil?
      Rails.logger.debug "Creating image collection for chapter #{id}"
      collection = build_chapter_image_collection(images: [])
      if collection.save
        Rails.logger.debug "Successfully created image collection with ID: #{collection.id}"
      else
        Rails.logger.error "Failed to create image collection: #{collection.errors.full_messages.join(', ')}"
      end
    end
    chapter_image_collection
  end

  def to_param
    "#{id}-#{slug}"
  end

  private

  def set_defaults
    self.view_count ||= 0
  end

  def update_manga_updated_at
    manga.touch if manga.present?
  end

  def create_image_collection
    build_chapter_image_collection(images: []).save
  end

  def set_slug
    return if slug.present?

    # Tạo slug từ số chapter - chỉ lấy phần số nguyên
    chapter_number = number.to_i
    self.slug = "chapter-#{chapter_number}"
  end
end
