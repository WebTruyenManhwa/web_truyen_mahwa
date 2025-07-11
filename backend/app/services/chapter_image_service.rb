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
    current_images = chapter.images
    
    # Xóa file ảnh thực tế nếu không phải ảnh external
    current_images.each do |img|
      if positions_to_delete.include?(img['position']) && !img['is_external']
        delete_stored_file(img['image'])
      end
    end
    
    filtered_images = current_images.reject { |img| positions_to_delete.include?(img['position']) }
    chapter.chapter_image_collection.update(images: filtered_images)
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
      position = positions.try(:[], index) || 
                (current_images.map { |img| img['position'].to_i }.max || -1) + 1 + index
      
      image_data = create_image_data(image, position)
      new_images_data << image_data if image_data.present?
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