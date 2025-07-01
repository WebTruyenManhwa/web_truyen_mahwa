class CreateChapterImages < ActiveRecord::Migration[8.0]
  def change
    create_table :chapter_images do |t|
      t.references :chapter, null: false, foreign_key: true
      t.string :image
      t.integer :position

      t.timestamps
    end
  end
end
