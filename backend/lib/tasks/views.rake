namespace :views do
  desc "Sync view counts from Redis to database"
  task sync: :environment do
    puts "Starting to sync view counts from Redis to database..."

    begin
      tracker = ViewTrackerService.instance
      tracker.sync_views_to_database
      puts "Successfully synced view counts from Redis to database."
    rescue Redis::CannotConnectError => e
      puts "Error connecting to Redis: #{e.message}"
    rescue => e
      puts "Error syncing view counts: #{e.message}"
    end
  end

  desc "Generate test view data in Redis for rankings"
  task generate_test_data: :environment do
    puts "Generating test view data in Redis..."

    begin
      tracker = ViewTrackerService.instance
      redis = Redis.new(url: ENV.fetch('REDIS_URL', 'redis://localhost:6379/0'))

      # Clear existing data
      keys = redis.keys("views:manga:*")
      redis.del(keys) unless keys.empty?

      # Generate random views for each manga
      Manga.find_each do |manga|
        # Generate views for the last 30 days
        (0..29).each do |days_ago|
          date = Date.today - days_ago
          date_str = date.to_s

          # Generate more views for more recent days and more popular manga
          base_views = manga.id % 10 + 1  # 1-10 based on manga ID
          day_factor = (30 - days_ago) / 2.0  # More views for recent days

          # Calculate views for this day
          daily_views = (base_views * day_factor).to_i
          daily_views = [daily_views, 1].max  # At least 1 view

          # Set the value in Redis
          redis.set("views:manga:#{manga.id}:#{date_str}", daily_views)

          # Add to total
          redis.incrby("views:manga:#{manga.id}:total", daily_views)
        end

        puts "Generated test data for manga #{manga.id}: #{manga.title}"
      end

      puts "Successfully generated test view data in Redis."
    rescue Redis::CannotConnectError => e
      puts "Error connecting to Redis: #{e.message}"
    rescue => e
      puts "Error generating test data: #{e.message}"
    end
  end
end
