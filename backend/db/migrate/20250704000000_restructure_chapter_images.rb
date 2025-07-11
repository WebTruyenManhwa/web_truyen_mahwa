class RestructureChapterImages < ActiveRecord::Migration[8.0]
  def change
    # Kiểm tra xem bảng đã tồn tại chưa
    unless table_exists?(:chapter_image_collections)
      # Tạo bảng mới để lưu trữ tất cả ảnh của một chapter
      create_table :chapter_image_collections do |t|
        t.references :chapter, null: false, foreign_key: true, index: true
        t.json :images, default: [] # Lưu trữ mảng các ảnh và vị trí của chúng
        t.timestamps
      end

      # Thêm index để tìm kiếm nhanh
      # add_index :chapter_image_collections, :chapter_id, unique: true unless index_exists?(:chapter_image_collections, :chapter_id, unique: true)
    end

    # Chúng ta sẽ giữ bảng chapter_images cũ cho đến khi di chuyển dữ liệu xong
    # và sẽ xóa nó trong một migration khác sau khi đã di chuyển dữ liệu
  end
end
