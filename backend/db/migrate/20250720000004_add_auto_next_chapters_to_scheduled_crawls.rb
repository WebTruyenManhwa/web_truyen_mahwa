class AddAutoNextChaptersToScheduledCrawls < ActiveRecord::Migration[8.0]
  def up
    unless column_exists?(:scheduled_crawls, :auto_next_chapters)
      add_column :scheduled_crawls, :auto_next_chapters, :boolean, default: false
    end
  end

  def down
    if column_exists?(:scheduled_crawls, :auto_next_chapters)
      remove_column :scheduled_crawls, :auto_next_chapters
    end
  end
end
