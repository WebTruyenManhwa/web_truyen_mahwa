class MigrateChapterImagesData < ActiveRecord::Migration[8.0]
  def up
    if table_exists?(:chapter_images) && table_exists?(:chapter_image_collections)
      execute <<-SQL
        INSERT INTO chapter_image_collections (chapter_id, images, created_at, updated_at)
        SELECT 
          c.id AS chapter_id,
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
        WHERE NOT EXISTS (
          SELECT 1 FROM chapter_image_collections cic WHERE cic.chapter_id = c.id
        );
      SQL
    else
      puts "Bỏ qua migration vì một trong các bảng không tồn tại"
    end
  end

  def down
    execute "TRUNCATE chapter_image_collections;" if table_exists?(:chapter_image_collections)
  end
end
