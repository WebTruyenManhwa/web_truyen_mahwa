class AddExternalUrlToChapterImages < ActiveRecord::Migration[8.0]
  def change
    add_column :chapter_images, :is_external, :boolean, default: false
    add_column :chapter_images, :external_url, :string
    
    # Thêm index cho is_external để tối ưu query
    add_index :chapter_images, :is_external
  end
end 