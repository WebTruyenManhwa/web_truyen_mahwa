class CreateNovelSeries < ActiveRecord::Migration[8.0]
  def change
    create_table :novel_series do |t|
      t.string :title
      t.string :author
      t.text :description
      t.string :cover_image
      t.string :status
      t.string :slug

      t.timestamps
    end
  end
end
