class AddBatchFieldsToNovelChapters < ActiveRecord::Migration[8.0]
  def change
    add_column :novel_chapters, :is_batch_chapter, :boolean
    add_column :novel_chapters, :batch_start, :integer
    add_column :novel_chapters, :batch_end, :integer
  end
end
