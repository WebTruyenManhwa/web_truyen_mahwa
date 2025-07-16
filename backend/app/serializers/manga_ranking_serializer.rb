class MangaRankingSerializer < MangaSerializer
  attributes :period_views, :latest_chapter, :chapters_count

  def initialize(object, options = {})
    super
    @period_views = options[:period_views]
    @latest_chapter = options[:latest_chapter]
    @chapters_count = options[:chapters_count]

    # Store preloaded data for chapters and images
    @instance_options = options
  end

  def period_views
    @period_views || object.view_count
  end

  def latest_chapter
    @latest_chapter
  end

  def chapters_count
    @chapters_count || 0
  end

  # Override chapters to return empty array for rankings
  # This prevents N+1 queries and serialization issues
  def chapters
    []
  end
end
