class CreateNovelChapters < ActiveRecord::Migration[8.0]
  def change
    create_table :novel_chapters do |t|
      t.string :title
      t.text :content
      t.integer :chapter_number
      t.references :novel_series, null: false, foreign_key: true
      t.string :slug

      t.timestamps
    end
  end
end
