class AddSourceUrlToMangas < ActiveRecord::Migration[8.0]
  def change
    add_column :mangas, :source_url, :string
  end
end
