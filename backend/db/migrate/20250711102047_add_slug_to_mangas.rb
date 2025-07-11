class AddSlugToMangas < ActiveRecord::Migration[8.0]
  def change
    add_column :mangas, :slug, :string
    add_index :mangas, :slug, unique: true
  end
end
