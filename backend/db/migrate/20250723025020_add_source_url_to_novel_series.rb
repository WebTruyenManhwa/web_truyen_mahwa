class AddSourceUrlToNovelSeries < ActiveRecord::Migration[8.0]
  def change
    add_column :novel_series, :source_url, :string
  end
end
