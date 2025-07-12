namespace :manga do
  desc "Update manga view counts based on chapter view counts"
  task update_view_counts: :environment do
    puts "Starting to update manga view counts..."

    # Get all mangas with chapters
    mangas = Manga.joins(:chapters).distinct

    mangas.find_each do |manga|
      # Calculate total views from chapters
      total_views = manga.chapters.sum(:view_count)

      # Update manga view count if it's less than total chapter views
      if manga.view_count < total_views
        puts "Updating manga '#{manga.title}' (ID: #{manga.id}): #{manga.view_count} -> #{total_views}"
        manga.update_column(:view_count, total_views)
      end
    end

    puts "Finished updating manga view counts!"
  end
end
