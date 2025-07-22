class AddIndexToNovelChapters < ActiveRecord::Migration[8.0]
  def change
    # Thêm index cho cột chapter_number nếu chưa tồn tại
    unless index_exists?(:novel_chapters, :chapter_number)
      add_index :novel_chapters, :chapter_number, name: "index_novel_chapters_on_chapter_number"
    end

    # Thêm composite index cho cả novel_series_id và chapter_number nếu chưa tồn tại
    unless index_exists?(:novel_chapters, [:novel_series_id, :chapter_number])
      add_index :novel_chapters, [:novel_series_id, :chapter_number], name: "index_novel_chapters_on_novel_id_and_chapter_number", unique: true
    end
  end
end
