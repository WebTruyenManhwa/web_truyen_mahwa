class CreateMangaViews < ActiveRecord::Migration[8.0]
  def change
    create_table :manga_views do |t|
      t.references :manga, null: false, foreign_key: true
      t.date :view_date, null: false
      t.integer :view_count, default: 0, null: false

      t.timestamps
    end

    # Add a unique index to ensure we only have one record per manga per day
    add_index :manga_views, [:manga_id, :view_date], unique: true

    # Add index for efficient date-based queries
    add_index :manga_views, :view_date
  end
end
