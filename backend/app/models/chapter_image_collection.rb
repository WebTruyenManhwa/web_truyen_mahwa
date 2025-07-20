class ChapterImageCollection < ApplicationRecord
  belongs_to :chapter

  # Đảm bảo images luôn là một mảng JSON
  def images
    self[:images] || []
  end

  # Thêm một ảnh mới vào collection
  def add_image(image_data)
    current_images = images
    current_images << image_data
    update(images: current_images)
  end

  # Thêm nhiều ảnh cùng một lúc (hiệu quả hơn)
  def add_images(image_data_array)
    return if image_data_array.empty?

    current_images = images
    current_images.concat(image_data_array)
    update(images: current_images)
  end

  # Cập nhật một ảnh theo vị trí
  def update_image_at_position(position, image_data)
    current_images = images
    index = current_images.find_index { |img| img['position'] == position }
    if index
      current_images[index] = current_images[index].merge(image_data)
      update(images: current_images)
    end
  end

  # Xóa một ảnh theo vị trí
  def remove_image_at_position(position)
    current_images = images
    current_images.reject! { |img| img['position'] == position }
    update(images: current_images)
  end

  # Sắp xếp lại vị trí các ảnh
  def reorder_images(position_mapping)
    Rails.logger.debug "Reordering images with mapping: #{position_mapping.inspect}"

    current_images = images
    Rails.logger.debug "Current images before reordering: #{current_images.inspect}"

    position_mapping.each do |old_position, new_position|
      # Ensure both are integers
      old_pos = old_position.to_i
      new_pos = new_position.to_i

      Rails.logger.debug "Moving image from position #{old_pos} to #{new_pos}"
      image = current_images.find { |img| img['position'].to_i == old_pos }
      if image
        image['position'] = new_pos
        Rails.logger.debug "Updated image: #{image.inspect}"
      else
        Rails.logger.warn "No image found at position #{old_pos}"
      end
    end

    # Sort images by position and ensure positions are sequential
    sorted_images = current_images.sort_by { |img| img['position'].to_i }
    Rails.logger.debug "Sorted images after reordering: #{sorted_images.inspect}"

    update(images: sorted_images)
  end
end
