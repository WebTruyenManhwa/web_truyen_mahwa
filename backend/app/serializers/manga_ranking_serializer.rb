class MangaRankingSerializer < MangaSerializer
  attributes :period_views, :latest_chapter, :chapters_count

  def initialize(object, options = {})
    super
    @period_views = options[:period_views]
    @latest_chapter = options[:latest_chapter]
    @chapters_count = options[:chapters_count]
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
end
