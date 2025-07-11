class GenerateSlugsForExistingRecords < ActiveRecord::Migration[8.0]
  def up
    # Tạo slug cho tất cả manga hiện có
    Manga.find_each do |manga|
      next if manga.slug.present?
      
      base_slug = manga.title.parameterize
      new_slug = base_slug
      counter = 2
      
      # Kiểm tra xem slug đã tồn tại chưa
      while Manga.where(slug: new_slug).where.not(id: manga.id).exists?
        new_slug = "#{base_slug}-#{counter}"
        counter += 1
      end
      
      manga.update_column(:slug, new_slug)
    end
    
    # Tạo slug cho tất cả chapter hiện có
    Chapter.find_each do |chapter|
      next if chapter.slug.present?
      
      # Tạo slug từ số chapter - chỉ lấy phần số nguyên
      chapter_number = chapter.number.to_i
      base_slug = "chapter-#{chapter_number}"
      new_slug = base_slug
      counter = 2
      
      # Kiểm tra xem slug đã tồn tại chưa
      while Chapter.where(slug: new_slug).where.not(id: chapter.id).exists?
        new_slug = "#{base_slug}-#{counter}"
        counter += 1
      end
      
      chapter.update_column(:slug, new_slug)
    end
  end

  def down
    # Không cần làm gì khi rollback
  end
end
