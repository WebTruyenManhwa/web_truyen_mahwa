class AddRenderedHtmlToNovelChapters < ActiveRecord::Migration[8.0]
  def change
    add_column :novel_chapters, :rendered_html, :text
  end
end
