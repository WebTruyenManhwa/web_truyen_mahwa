class DropChapterImagesTable < ActiveRecord::Migration[8.0]
  def up
    # Xóa bảng chapter_images sau khi đã di chuyển dữ liệu thành công
    if table_exists?(:chapter_images)
      drop_table :chapter_images
    else
      say "Bảng chapter_images không tồn tại, bỏ qua bước xóa bảng"
    end
  end

  def down
    # Tạo lại bảng chapter_images nếu cần rollback
    unless table_exists?(:chapter_images)
      create_table :chapter_images do |t|
        t.references :chapter, null: false, foreign_key: true
        t.string :image
        t.integer :position
        t.boolean :is_external, default: false
        t.string :external_url
        t.timestamps
      end
      
      add_index :chapter_images, :is_external
    end
    
    # Lưu ý: Dữ liệu sẽ không được khôi phục tự động
    # Cần phải viết code để chuyển dữ liệu từ chapter_image_collections sang chapter_images
  end
end 