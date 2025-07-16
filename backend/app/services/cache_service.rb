class CacheService
  class << self
    # Version number to invalidate all caches when code changes
    CACHE_VERSION = 1

    # Generate cache key for params
    def params_cache_key(params)
      # Convert ActionController::Parameters to a regular hash and sort
      params_hash = params.to_unsafe_h rescue params.to_h
      sorted_params = params_hash.sort.to_h
      # Convert to string and add version
      "v#{CACHE_VERSION}/#{sorted_params.to_json.hash}"
    end

    # Generate cache key for manga show
    def manga_show_cache_key(manga)
      "mangas/show/v#{CACHE_VERSION}/#{manga.id}-#{manga.updated_at.to_i}-rating#{manga.rating}-votes#{manga.total_votes}"
    end

    # Generate cache key for rankings day
    def rankings_day_cache_key(limit)
      "rankings/day/v#{CACHE_VERSION}/limit-#{limit}"
    end

    # Generate cache key for rankings week
    def rankings_week_cache_key(limit)
      "rankings/week/v#{CACHE_VERSION}/limit-#{limit}"
    end

    # Generate cache key for rankings month
    def rankings_month_cache_key(limit)
      "rankings/month/v#{CACHE_VERSION}/limit-#{limit}"
    end

    # Clear all manga-related caches
    def clear_manga_cache(manga)
      Rails.cache.delete(manga_show_cache_key(manga))
      Rails.cache.delete("mangas/index/")

      # Clear rankings caches
      Rails.cache.delete(rankings_day_cache_key(6))
      Rails.cache.delete(rankings_day_cache_key(20))
      Rails.cache.delete(rankings_week_cache_key(6))
      Rails.cache.delete(rankings_week_cache_key(20))
      Rails.cache.delete(rankings_month_cache_key(6))
      Rails.cache.delete(rankings_month_cache_key(20))
    end

    # Create a clear cache script that can be run when needed
    def clear_all_caches
      Rails.logger.info "=== Clearing all caches ==="
      Rails.cache.clear
      Rails.logger.info "=== All caches cleared successfully ==="
    end
  end
end
