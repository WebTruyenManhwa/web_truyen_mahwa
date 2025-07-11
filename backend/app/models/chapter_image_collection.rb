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
    current_images = images
    position_mapping.each do |old_position, new_position|
      image = current_images.find { |img| img['position'] == old_position }
      image['position'] = new_position if image
    end
    update(images: current_images.sort_by { |img| img['position'] })
  end
end