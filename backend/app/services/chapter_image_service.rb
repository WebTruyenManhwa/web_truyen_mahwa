class ChapterImageService
  attr_reader :chapter

  def initialize(chapter)
    @chapter = chapter
  end

  # Xử lý tải lên nhiều ảnh mới
  def upload_images(images)
    return if images.blank?

    images_data = []
    images.each_with_index do |image, index|
      images_data << create_image_data(image, index)
    end

    # Lưu tất cả ảnh vào collection
    chapter.ensure_image_collection
    chapter.chapter_image_collection.update(images: images_data)
  end

  # Xử lý xóa ảnh theo vị trí
  def delete_images(positions_to_delete)
    return if positions_to_delete.blank?

    positions_to_delete = Array(positions_to_delete).map(&:to_i)
    Rails.logger.debug "Deleting images at positions: #{positions_to_delete.inspect}"

    current_images = chapter.images
    Rails.logger.debug "Current images before deletion: #{current_images.inspect}"

    # Xóa file ảnh thực tế nếu không phải ảnh external
    current_images.each do |img|
      if positions_to_delete.include?(img['position'].to_i) && !img['is_external']
        Rails.logger.debug "Deleting file for image at position #{img['position']}: #{img['image']}"
        delete_stored_file(img['image'])
      end
    end

    filtered_images = current_images.reject { |img| positions_to_delete.include?(img['position'].to_i) }
    Rails.logger.debug "Filtered images after deletion: #{filtered_images.inspect}"

    # Compact positions to ensure they are sequential
    compacted_images = filtered_images.sort_by { |img| img['position'].to_i }.map.with_index do |img, index|
      img['position'] = index
      img
    end

    Rails.logger.debug "Compacted images with sequential positions: #{compacted_images.inspect}"
    chapter.chapter_image_collection.update(images: compacted_images)
  end

  # Xử lý sắp xếp lại vị trí các ảnh
  def reorder_images(position_mapping)
    return if position_mapping.blank?

    mapping = {}
    position_mapping.each do |old_pos, new_pos|
      mapping[old_pos.to_i] = new_pos.to_i
    end

    chapter.reorder_images(mapping)
  end

  # Xử lý thêm ảnh mới
  def add_new_images(new_images, positions = nil)
    return if new_images.blank?

    # Đảm bảo có image collection
    chapter.ensure_image_collection

    current_images = chapter.images
    new_images_data = []

    Array(new_images).each_with_index do |image, index|
      position = positions.try(:[], index).to_i ||
                (current_images.map { |img| img['position'].to_i }.max || -1) + 1 + index

      # Kiểm tra xem image có phải là URL không
      if image.is_a?(String) && image =~ URI::regexp(%w[http https])
        Rails.logger.debug "Adding external image URL at position #{position}: #{image}"
        new_images_data << {
          'image' => nil,
          'position' => position,
          'is_external' => true,
          'external_url' => image
        }
      else
        # Xử lý như file upload thông thường
        image_data = create_image_data(image, position)
        new_images_data << image_data if image_data.present?
      end
    end

    # Thêm ảnh mới vào collection nếu có
    if new_images_data.present?
      updated_images = current_images + new_images_data
      chapter.chapter_image_collection.update(images: updated_images)
    end
  end

  # Xử lý thêm ảnh từ URL bên ngoài
  def add_external_images(external_urls)
    return if external_urls.blank?

    # Đảm bảo có image collection
    chapter.ensure_image_collection

    current_images = chapter.images
    new_images_data = []

    # Tính vị trí bắt đầu cho ảnh mới
    start_position = (current_images.map { |img| img['position'].to_i }.max || -1) + 1

    Array(external_urls).each_with_index do |url, index|
      next unless url.is_a?(String) && url =~ URI::regexp(%w[http https])

      position = start_position + index
      Rails.logger.debug "Adding external image at position #{position}: #{url}"

      new_images_data << {
        'image' => nil,
        'position' => position,
        'is_external' => true,
        'external_url' => url
      }
    end

    # Thêm ảnh mới vào collection nếu có
    if new_images_data.present?
      updated_images = current_images + new_images_data
      chapter.chapter_image_collection.update(images: updated_images)
    end
  end

  private

  # Tạo dữ liệu cho một ảnh
  def create_image_data(image, position)
    # Xử lý cho ảnh tải lên
    if image.is_a?(ActionDispatch::Http::UploadedFile)
      # Upload ảnh trực tiếp bằng CarrierWave mà không cần ChapterImage
      uploader = ChapterImageUploader.new
      uploader.store!(image)

      if uploader.file.present?
        Rails.logger.debug "Uploaded file directly: #{uploader.identifier}"
        Rails.logger.debug "File path: #{uploader.path}" if uploader.path.present?

      {
        'image' => uploader.identifier,
        'position' => position.to_i,
        'is_external' => false,
        'external_url' => nil,
        'storage_path' => uploader.store_path
      }
      else
        Rails.logger.error "Failed to upload file directly"
        nil
      end
    # Xử lý cho ảnh từ URL bên ngoài
    elsif image.is_a?(String) && image =~ URI::regexp(%w[http https])
      Rails.logger.debug "Creating image data for external URL: #{image}"
      {
        'image' => nil,
        'position' => position.to_i,
        'is_external' => true,
        'external_url' => image
      }
    else
      Rails.logger.error "Unsupported image type: #{image.class}"
      nil
    end
  end

  # Xóa file ảnh đã lưu trữ
  def delete_stored_file(identifier)
    return unless identifier.present?

    begin
    # Tạo một uploader tạm thời để xóa file
    uploader = ChapterImageUploader.new
    uploader.retrieve_from_store!(identifier)
    uploader.remove!
      Rails.logger.debug "Đã xóa file: #{identifier}"
  rescue => e
    Rails.logger.error "Lỗi khi xóa file: #{e.message}"
      Rails.logger.error e.backtrace.join("\n")
    end
  end
end
