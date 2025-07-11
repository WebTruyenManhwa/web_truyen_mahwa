class MigrateChapterImagesData < ActiveRecord::Migration[8.0]
  def up
    # Kiểm tra xem cả hai bảng đều tồn tại
    if table_exists?(:chapter_images) && table_exists?(:chapter_image_collections)
      # Di chuyển dữ liệu từ bảng cũ sang bảng mới
      execute <<-SQL
        INSERT INTO chapter_image_collections (chapter_id, images, created_at, updated_at)
        SELECT 
          chapter_id,
          (
            SELECT json_agg(
              json_build_object(
                'image', COALESCE(image, ''),
                'position', COALESCE(position, 0),
                'is_external', COALESCE(is_external, false),
                'external_url', COALESCE(external_url, '')
              ) ORDER BY position
            )
            FROM chapter_images ci
            WHERE ci.chapter_id = c.id
          ) as images,
          NOW(),
          NOW()
        FROM (SELECT DISTINCT chapter_id as id FROM chapter_images) c
        -- Chỉ chèn dữ liệu cho các chapter chưa có trong bảng mới
        WHERE NOT EXISTS (
          SELECT 1 FROM chapter_image_collections cic WHERE cic.chapter_id = c.id
        );
      SQL
    else
      puts "Bỏ qua migration vì một trong các bảng không tồn tại"
    end
  end

  def down
    # Xóa tất cả dữ liệu trong bảng mới
    execute "TRUNCATE chapter_image_collections;" if table_exists?(:chapter_image_collections)
  end
end
