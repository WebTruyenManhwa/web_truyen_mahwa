class MangaWithChaptersSerializer < MangaSerializer
  attributes :cover_image_url, :using_remote_cover_image

  def cover_image_url
    object.cover_image_url
  end

  def using_remote_cover_image
    object.using_remote_cover_image?
  end

  # Thêm thông tin chapter mới nhất nếu có
  def add_latest_chapter(latest_chapter)
    if latest_chapter
      @instance_options[:latest_chapter] = latest_chapter
    end
  end

  # Thêm số lượng chapter nếu có
  def add_chapters_count(count)
    @instance_options[:chapters_count] = count
  end

  # Thêm lượt xem theo thời gian
  def add_period_views(views)
    @instance_options[:period_views] = views
  end

  # Override chapters to use preloaded data
  def chapters
    # Return empty array to avoid N+1 queries in index action
    # The actual chapters are loaded in the controller and passed via preload
    []
  end

  # Ghi đè phương thức as_json để thêm thông tin bổ sung
  def as_json(options = {})
    # Merge options với instance_options hiện tại
    @instance_options = @instance_options.merge(options) if options.present?

    json = super(@instance_options)

    # Thêm latest_chapter nếu có
    if @instance_options[:latest_chapter]
      json['latest_chapter'] = @instance_options[:latest_chapter]
    end

    # Thêm chapters_count nếu có
    if @instance_options[:chapters_count]
      json['chapters_count'] = @instance_options[:chapters_count]
    end

    # Thêm period_views nếu có
    if @instance_options[:period_views]
      json['period_views'] = @instance_options[:period_views]
    end

    json
  end
end
