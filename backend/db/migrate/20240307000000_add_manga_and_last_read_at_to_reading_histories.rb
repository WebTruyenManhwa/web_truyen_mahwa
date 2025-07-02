class AddMangaAndLastReadAtToReadingHistories < ActiveRecord::Migration[8.0]
  def change
    add_reference :reading_histories, :manga, null: false, foreign_key: true
    add_column :reading_histories, :last_read_at, :datetime

    add_index :reading_histories, [:user_id, :manga_id, :chapter_id], unique: true, name: 'index_reading_histories_on_user_manga_chapter'

  end
end
