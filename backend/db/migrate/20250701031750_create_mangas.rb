class CreateMangas < ActiveRecord::Migration[8.0]
  def change
    create_table :mangas do |t|
      t.string :title
      t.text :description
      t.string :cover_image
      t.integer :status
      t.string :author
      t.string :artist
      t.integer :release_year
      t.integer :view_count

      t.timestamps
    end
  end
end
