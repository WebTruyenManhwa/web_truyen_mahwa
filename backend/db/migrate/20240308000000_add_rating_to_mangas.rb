class AddRatingToMangas < ActiveRecord::Migration[8.0]
  def change
    add_column :mangas, :rating, :decimal, precision: 3, scale: 2, default: 0
    add_column :mangas, :total_votes, :integer, default: 0
  end
end 