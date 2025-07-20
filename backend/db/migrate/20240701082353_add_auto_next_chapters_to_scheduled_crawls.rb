class AddAutoNextChaptersToScheduledCrawls < ActiveRecord::Migration[7.1]
  def change
    add_column :scheduled_crawls, :auto_next_chapters, :boolean, default: false
  end
end
