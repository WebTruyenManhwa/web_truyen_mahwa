class AddIndexToChapterImageCollectionsOnChapterId < ActiveRecord::Migration[8.0]
  def change
    # Add an index to chapter_image_collections on chapter_id for faster lookups
    add_index :chapter_image_collections, :chapter_id, name: 'index_chapter_image_collections_on_chapter_id', if_not_exists: true
  end
end
