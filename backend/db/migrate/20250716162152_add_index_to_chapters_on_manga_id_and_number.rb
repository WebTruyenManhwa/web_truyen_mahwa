class AddIndexToChaptersOnMangaIdAndNumber < ActiveRecord::Migration[8.0]
  def change
    # Add a composite index on manga_id and number to optimize queries
    # that filter by manga_id and sort by number
    add_index :chapters, [:manga_id, :number], name: 'index_chapters_on_manga_id_and_number'
  end
end

