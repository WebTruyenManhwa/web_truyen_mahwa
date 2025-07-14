class ChapterForm
  include ActiveModel::Model

  attr_accessor :id, :title, :number, :manga_id, :images, :image_positions_to_delete,
                :image_positions, :new_images, :new_image_positions, :external_image_urls

  validates :title, presence: true
  validates :number, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :manga_id, presence: true

  # Validate images nếu có
  validate :validate_images

  def initialize(attributes = {})
    super
    @image_positions_to_delete ||= []
    @image_positions ||= {}
    @new_image_positions ||= []
    @external_image_urls ||= []
  end

  def save
    return false unless valid?

    chapter = nil
    ActiveRecord::Base.transaction do
      # Tạo hoặc cập nhật chapter
      manga = Manga.find(manga_id)
      chapter = manga.chapters.find_or_initialize_by(id: id)

      # Check if a chapter with this number already exists (for a different chapter)
      if chapter.new_record? && manga.chapters.where(number: number).exists?
        errors.add(:number, "đã tồn tại cho manga này")
        raise ActiveRecord::Rollback
      end

      chapter.title = title
      chapter.number = number
      chapter.save!

      # Xử lý ảnh
      image_service = ChapterImageService.new(chapter)

      # Xóa ảnh
      image_service.delete_images(image_positions_to_delete) if image_positions_to_delete.present?

      # Sắp xếp lại ảnh
      image_service.reorder_images(image_positions) if image_positions.present?

      # Thêm ảnh mới hoặc tải lên ảnh ban đầu
      if new_images.present?
        image_service.add_new_images(new_images, new_image_positions)
      elsif images.present?
        image_service.upload_images(images)
      end

      # Xử lý external_image_urls nếu có
      if external_image_urls.present?
        image_service.add_external_images(external_image_urls)
      end
    end

    return false if errors.any?
    chapter
  rescue ActiveRecord::RecordInvalid => e
    errors.add(:base, e.record.errors.full_messages.join(', '))
    false
  end

  private

  def validate_images
    return unless images.present? || new_images.present?

    # Kiểm tra images
    if images.present?
      Array(images).each do |image|
        validate_image(image)
      end
    end

    # Kiểm tra new_images
    if new_images.present?
      Array(new_images).each do |image|
        validate_image(image)
      end
    end
  end

  def validate_image(image)
    # Kiểm tra ảnh tải lên
    if image.is_a?(ActionDispatch::Http::UploadedFile)
      unless image.content_type.in?(%w[image/jpeg image/png image/gif image/webp])
        errors.add(:images, "phải là định dạng ảnh hợp lệ (jpeg, png, gif, webp)")
      end

      if image.size > 10.megabytes
        errors.add(:images, "không được vượt quá 10MB")
      end
    # Kiểm tra URL ảnh bên ngoài
    elsif image.is_a?(String)
      unless image =~ URI::regexp(%w[http https])
        errors.add(:images, "phải là URL hợp lệ")
      end
    else
      errors.add(:images, "không hợp lệ")
    end
  end
end
