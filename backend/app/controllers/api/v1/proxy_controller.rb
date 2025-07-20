require 'net/http'
require 'uri'

class Api::V1::ProxyController < Api::V1::BaseController
  skip_before_action :authenticate_user!, only: [:fetch_url]
  before_action :authenticate_admin!, only: [:batch_import_chapters, :crawl_manga]

  # GET /api/v1/proxy/fetch?url=https://example.com
  def fetch_url
    url = params[:url]
    result = UrlProxyService.fetch_url(url)

    if result[:error]
      render json: { error: result[:error] }, status: result[:status]
    else
      render plain: result[:body], content_type: result[:content_type]
    end
  end

  # POST /api/v1/proxy/batch_import_chapters
  # Params:
  # - manga_id: ID of the manga to add chapters to
  # - urls: Array of URLs to import chapters from
  # - auto_number: Boolean to auto-number chapters (default: true)
  # - start_number: Starting number for auto-numbering (default: 1)
  def batch_import_chapters
    manga_id = params[:manga_id]
    urls = params[:urls]

    unless manga_id.present? && urls.present? && urls.is_a?(Array)
      return render json: { error: 'manga_id and urls array are required' }, status: :bad_request
    end

    # Find the manga
    manga = Manga.find_by(id: manga_id)
    unless manga
      return render json: { error: 'Manga not found' }, status: :not_found
    end

    # Sử dụng service để import chapters
    results = ChapterImportService.batch_import(
      manga,
      urls,
      auto_number: params.fetch(:auto_number, true),
      start_number: params.fetch(:start_number, 1).to_f
    )

    render json: { results: results }
  end

  # POST /api/v1/proxy/crawl_manga
  # Params:
  # - url: URL của trang truyện cần crawl
  # - max_chapters: Số lượng chương tối đa cần crawl hoặc "all" (optional)
  # - chapter_range: Range chương cần crawl, ví dụ: "7-20" (optional, bắt buộc nếu max_chapters là số và không có auto_next_chapters)
  # - auto_next_chapters: Nếu true, sẽ tự động crawl từ chapter mới nhất trong hệ thống (optional)
  # - delay: Range delay giữa các request, ví dụ: "2..5" (optional)
  # - schedule: Tùy chọn đặt lịch, nếu true thì sẽ tạo lịch crawl thay vì chạy ngay (optional)
  # - schedule_type: Loại lịch (daily, weekly, monthly) (required if schedule=true)
  # - schedule_time: Thời gian chạy trong ngày, format: "HH:MM" (required if schedule=true)
  # - schedule_days: Các ngày trong tuần để chạy (đối với weekly), format: "1,2,3" (required if schedule_type=weekly)
  def crawl_manga
    url = params[:url]

    unless url.present?
      return render json: { error: 'URL is required' }, status: :bad_request
    end

    # Tùy chọn
    options = {}

    # Xử lý auto_next_chapters
    auto_next_chapters = params[:auto_next_chapters] == 'true' || params[:auto_next_chapters] == true
    options[:auto_next_chapters] = auto_next_chapters if auto_next_chapters

    # Xử lý max_chapters
    if params[:max_chapters].present?
      if params[:max_chapters].downcase == 'all'
        options[:max_chapters] = nil # Crawl tất cả
      else
        # Nếu max_chapters là số, kiểm tra xem có chapter_range hoặc auto_next_chapters không
        begin
          max_chapters = Integer(params[:max_chapters])
          options[:max_chapters] = max_chapters

          # Nếu max_chapters là số và không có chapter_range và không có auto_next_chapters, báo lỗi
          if !params[:chapter_range].present? && !auto_next_chapters
            return render json: {
              error: 'chapter_range is required when max_chapters is a number and auto_next_chapters is not enabled. Format: "start-end" (e.g., "7-20")'
            }, status: :bad_request
          end
        rescue ArgumentError
          return render json: { error: 'max_chapters must be a number or "all"' }, status: :bad_request
        end
      end
    end

    # Xử lý chapter_range
    if params[:chapter_range].present?
      # Nếu max_chapters là "all" hoặc bỏ trống, không cho phép nhập chapter_range
      if params[:max_chapters].blank? || params[:max_chapters].downcase == 'all'
        return render json: {
          error: 'chapter_range is not allowed when max_chapters is "all" or not specified'
        }, status: :bad_request
      end

      # Nếu đã bật auto_next_chapters, không cho phép nhập chapter_range
      if auto_next_chapters
        return render json: {
          error: 'chapter_range is not allowed when auto_next_chapters is enabled'
        }, status: :bad_request
      end

      # Kiểm tra format của chapter_range (phải là "start-end")
      range_match = params[:chapter_range].match(/^(\d+(\.\d+)?)-(\d+(\.\d+)?)$/)
      unless range_match
        return render json: {
          error: 'Invalid chapter_range format. Must be "start-end" (e.g., "7-20" or "17.1-17.5")'
        }, status: :bad_request
      end

      start_chapter = range_match[1].to_f
      end_chapter = range_match[3].to_f

      # Kiểm tra start_chapter <= end_chapter
      if start_chapter > end_chapter
        return render json: {
          error: 'Start chapter must be less than or equal to end chapter'
        }, status: :bad_request
      end

      options[:chapter_range] = {
        start: start_chapter,
        end: end_chapter
      }
    end

    # Xử lý delay range nếu có
    if params[:delay].present? && params[:delay].include?('..')
      min, max = params[:delay].split('..').map(&:to_i)
      options[:delay] = min..max if min && max && min < max
    end

    # Xử lý tùy chọn đặt lịch
    if params[:schedule] == 'true' || params[:schedule] == true
      # Kiểm tra các tham số bắt buộc cho đặt lịch
      unless params[:schedule_type].present?
        return render json: { error: 'schedule_type is required when schedule=true' }, status: :bad_request
      end

      unless params[:schedule_time].present?
        return render json: { error: 'schedule_time is required when schedule=true' }, status: :bad_request
      end

      # Kiểm tra schedule_type hợp lệ
      unless %w[daily weekly monthly].include?(params[:schedule_type])
        return render json: { error: 'schedule_type must be one of: daily, weekly, monthly' }, status: :bad_request
      end

      # Kiểm tra schedule_days nếu schedule_type là weekly
      if params[:schedule_type] == 'weekly' && !params[:schedule_days].present?
        return render json: { error: 'schedule_days is required when schedule_type=weekly' }, status: :bad_request
      end

      # Kiểm tra format của schedule_time
      unless params[:schedule_time].match?(/^\d{1,2}:\d{2}$/)
        return render json: { error: 'schedule_time must be in format "HH:MM"' }, status: :bad_request
      end

      # Tìm manga từ URL
      manga_info = MangaCrawlerService.extract_manga_info(url)
      manga = Manga.find_by("lower(title) = ?", manga_info[:title].downcase)

      # Nếu không tìm thấy manga, tạo mới
      unless manga
        manga = MangaCrawlerService.find_or_create_manga(manga_info)
      end

      # Tạo lịch crawl
      scheduled_crawl = ScheduledCrawl.new(
        manga: manga,
        url: url,
        schedule_type: params[:schedule_type],
        schedule_time: Time.parse(params[:schedule_time]),
        schedule_days: params[:schedule_days],
        max_chapters: params[:max_chapters],
        chapter_range: params[:chapter_range],
        delay: params[:delay],
        auto_next_chapters: auto_next_chapters,
        status: 'active'
      )

      if scheduled_crawl.save
        # Tạo một scheduled job để theo dõi scheduled crawl này
        # Nhưng đặt scheduled_at theo thời gian đã lên lịch, không phải thời gian hiện tại
        # Điều này đảm bảo job sẽ chỉ được xử lý khi đến thời gian đã lên lịch
        scheduled_time = scheduled_crawl.next_run_at

        Rails.logger.info "Creating scheduled job for scheduled crawl ##{scheduled_crawl.id} to run at #{scheduled_time}"
        job = ScheduledJob.create(
          job_type: 'scheduled_crawl_check',
          status: 'pending',
          scheduled_at: scheduled_time,
          options: { scheduled_crawl_id: scheduled_crawl.id }
        )

        # Không thêm job vào hàng đợi để xử lý ngay lập tức
        # Job sẽ được xử lý tự động khi đến thời gian đã lên lịch thông qua process_database_jobs

        render json: {
          status: 'success',
          message: 'Scheduled crawl created successfully',
          scheduled_crawl: scheduled_crawl
        }
      else
        render json: {
          status: 'error',
          message: 'Failed to create scheduled crawl',
          errors: scheduled_crawl.errors
        }, status: :unprocessable_entity
      end
    else
      # Chạy trong background job để không block request
      job = CrawlMangaJob.perform_later(url, options)

      render json: {
        status: 'success',
        message: 'Crawl manga job has been queued',
        url: url,
        options: options,
        job_id: job.job_id
      }
    end
  end

  # POST /api/v1/proxy/test_extract_images
  # Params:
  # - url: URL của chapter cần extract hình ảnh
  def test_extract_images
    url = params[:url]

    unless url.present?
      return render json: { error: 'URL is required' }, status: :bad_request
    end

    begin
      # Sử dụng ImageExtractorService để extract hình ảnh
      image_urls = ImageExtractorService.extract_from_url(url)

      # Trả về kết quả
      render json: {
        status: 'success',
        url: url,
        image_count: image_urls.size,
        images: image_urls
      }
    rescue => e
      render json: {
        status: 'error',
        url: url,
        error: e.message
      }, status: :unprocessable_entity
    end
  end
end
