require 'nokogiri'
require 'net/http'
require 'uri'

class MangaCrawlerService
  # Thời gian delay giữa các request để tránh bị chặn
  DEFAULT_DELAY = 2..5 # Delay ngẫu nhiên từ 2-5 giây
  MAX_RETRIES = 3 # Số lần thử lại tối đa khi request thất bại

  # Crawl toàn bộ truyện từ URL
  def self.crawl_manga(manga_url, options = {})
    # Kiểm tra URL hợp lệ
    unless manga_url.include?('nettruyen') || manga_url.include?('nettruyenmax')
      return { status: 'error', message: 'URL không được hỗ trợ. Chỉ hỗ trợ NetTruyen.' }
    end

    begin
      # Chuẩn hóa options
      options = options.transform_keys(&:to_sym) if options.is_a?(Hash)

      # Chuyển đổi auto_next_chapters từ string thành boolean
      if options[:auto_next_chapters].is_a?(String)
        options[:auto_next_chapters] = options[:auto_next_chapters].to_s.downcase == 'true'
      end

      # Đảm bảo auto_next_chapters là boolean
      if options['auto_next_chapters'].present?
        options[:auto_next_chapters] = options['auto_next_chapters'].to_s.downcase == 'true'
      end

      # Log options ban đầu
      Rails.logger.info "Original options: #{options.inspect}"
      Rails.logger.info "Original max_chapters type: #{options[:max_chapters].class.name}, value: #{options[:max_chapters].inspect}"
      Rails.logger.info "Original auto_next_chapters type: #{options[:auto_next_chapters].class.name}, value: #{options[:auto_next_chapters].inspect}"
      # Lấy thông tin truyện
      manga_info = extract_manga_info(manga_url)

      # Lấy danh sách chương
      chapters = extract_chapter_list(manga_url)

      if chapters.empty?
        return { status: 'error', message: 'Không tìm thấy chương nào.' }
      end

      # Tạo manga nếu chưa tồn tại
      manga = find_or_create_manga(manga_info)

      # Xử lý auto_next_chapters nếu được bật
      auto_next_chapters = [true, 'true'].include?(options[:auto_next_chapters])
      Rails.logger.info "Auto next chapters is: #{auto_next_chapters} (original value: #{options[:auto_next_chapters].inspect})"

      if auto_next_chapters && options[:max_chapters].present?
        # Lấy số chapter lớn nhất hiện tại trong database
        latest_chapter = manga.chapters.maximum(:number)

        Rails.logger.info "Auto next chapters is enabled and max_chapters is present: #{options[:max_chapters]}"

        if latest_chapter.present?
          Rails.logger.info "Auto next chapters enabled. Latest chapter in database: #{latest_chapter}"
          Rails.logger.info "First 5 chapters from source (newest first): #{chapters.take(5).map { |c| "#{c[:title]} (#{c[:number]})" }.join(', ')}"

          # Lọc chapters chỉ lấy những chapter có số lớn hơn chapter mới nhất trong database
          # Lưu ý: chapters từ trang web đã được sắp xếp từ mới đến cũ
          new_chapters = chapters.select do |chapter|
            chapter_number = chapter[:number].to_f
            result = chapter_number > latest_chapter
            Rails.logger.info "Checking chapter #{chapter[:title]} (#{chapter_number}) > #{latest_chapter}? #{result}"
            result
          end

          Rails.logger.info "Found #{new_chapters.size} chapters newer than #{latest_chapter}"

          # Sắp xếp lại theo số chương tăng dần để crawl từ cũ đến mới
          new_chapters = new_chapters.sort_by { |c| c[:number] || 0 }

          Rails.logger.info "Chapters to crawl (sorted ascending): #{new_chapters.take(5).map { |c| "#{c[:title]} (#{c[:number]})" }.join(', ')}"

          # Gán lại biến chapters
          chapters = new_chapters
        else
          Rails.logger.info "No existing chapters found in database, will crawl from beginning"
        end
      # Xử lý chapter range nếu có
      elsif options[:chapter_range].present?
        start_chapter = options[:chapter_range][:start]
        end_chapter = options[:chapter_range][:end]

        # Lọc chapters theo range
        chapters = chapters.select do |chapter|
          chapter_number = chapter[:number].to_f
          chapter_number >= start_chapter && chapter_number <= end_chapter
        end

        # Sắp xếp lại theo số chương tăng dần
        chapters = chapters.sort_by { |c| c[:number] || 0 }
      end

      # Log options sau khi xử lý auto_next_chapters
      Rails.logger.info "Options after processing: #{options.inspect}"
      Rails.logger.info "Max chapters after processing type: #{options[:max_chapters].class.name}, value: #{options[:max_chapters].inspect}"

      # Số chương cần crawl - Xử lý triệt để
      max_chapters = if options[:max_chapters].present?
        # Nếu là chuỗi "all", lấy tất cả chapter
        if options[:max_chapters].to_s.downcase == "all"
          chapters.size
        else
          # Đảm bảo chuyển đổi thành số nguyên
          limit = options[:max_chapters].to_i
          # Nếu giá trị chuyển đổi là 0 (không hợp lệ), mặc định là 5
          limit = 5 if limit <= 0
          limit
        end
      else
        # Mặc định là 5 chapter nếu không có giá trị
        5
      end

      # Log thông tin về max_chapters
      Rails.logger.info "Final max chapters to crawl: #{max_chapters}, Available chapters: #{chapters.size}"

      # Đảm bảo chỉ lấy đúng số lượng chapter được chỉ định
      chapters_to_crawl = chapters.take(max_chapters)

      # Kết quả crawl
      results = {
        manga: {
          id: manga.id,
          title: manga.title,
          total_chapters: chapters.size,
          crawled_chapters: 0
        },
        chapters: []
      }

      # Crawl từng chương
      chapters_to_crawl.each_with_index do |chapter_data, index|
        # Nếu job_id được truyền vào, kiểm tra trạng thái của job
        if options[:job_id].present?
          job = ScheduledJob.find_by(id: options[:job_id])
          if job && job.status != 'running'
            Rails.logger.info "Job ##{options[:job_id]} is no longer running (status: #{job.status}). Stopping crawl."
            break
          end
        end

        # Xử lý delay
        delay = options[:delay] || DEFAULT_DELAY
        if delay.is_a?(String) && delay.include?('..')
          # Chuyển đổi chuỗi "3..7" thành range 3..7
          start_delay, end_delay = delay.split('..').map(&:to_i)
          sleep_time = rand(start_delay..end_delay)
          Rails.logger.info "Sleeping for #{sleep_time} seconds (delay: #{delay})"
          sleep(sleep_time)
        else
          # Sử dụng delay như bình thường
          sleep(rand(delay))
        end

        # Crawl chương
        chapter_result = crawl_chapter(manga, chapter_data)
        results[:chapters] << chapter_result

        # Cập nhật số chương đã crawl
        results[:manga][:crawled_chapters] += 1

        # Log tiến trình
        Rails.logger.info "Crawled chapter #{index + 1}/#{chapters_to_crawl.size} for manga '#{manga.title}'"
      end

      # Trả về kết quả
      results.merge(status: 'success')
    rescue => e
      Rails.logger.error "Error crawling manga: #{e.message}"
      Rails.logger.error e.backtrace.join("\n")
      { status: 'error', message: e.message }
    end
  end

  # Lấy thông tin manga từ URL
  def self.extract_manga_info(manga_url)
    html = fetch_html_with_retry(manga_url)
    doc = Nokogiri::HTML(html)

    # Lấy tiêu đề truyện
    title = doc.at_css('.title-detail')&.text&.strip

    # Lấy mô tả
    description = doc.at_css('.detail-content p')&.text&.strip

    # Lấy tác giả
    author = doc.at_css('.author .col-xs-8')&.text&.strip

    # Lấy thể loại
    genres = doc.css('.kind .col-xs-8 a').map { |a| a.text.strip }

    # Lấy ảnh bìa
    cover_image = doc.at_css('.detail-info img')&.attr('src')

    # Đảm bảo URL ảnh bìa hợp lệ
    if cover_image.present?
      # Thêm schema nếu URL là relative
      unless cover_image.start_with?('http://', 'https://')
        if cover_image.start_with?('//')
          cover_image = "https:#{cover_image}"
        else
          # Lấy domain từ manga_url
          uri = URI.parse(manga_url)
          base_url = "#{uri.scheme}://#{uri.host}"

          # Thêm domain vào URL ảnh
          cover_image = if cover_image.start_with?('/')
                          "#{base_url}#{cover_image}"
                        else
                          "#{base_url}/#{cover_image}"
                        end
        end
      end

      # Log URL ảnh bìa sau khi xử lý
      Rails.logger.info "Cover image URL after processing: #{cover_image}"
    end

    # Lấy trạng thái
    status = doc.at_css('.status .col-xs-8')&.text&.strip

    {
      title: title,
      description: description,
      author: author,
      genres: genres,
      cover_image: cover_image,
      status: status,
      source_url: manga_url
    }
  end

  # Lấy danh sách chương từ URL
  def self.extract_chapter_list(manga_url)
    html = fetch_html_with_retry(manga_url)
    doc = Nokogiri::HTML(html)

    chapters = []

    # Tìm tất cả các chương
    doc.css('#nt_listchapter ul li').each do |li|
      # Lấy link chương
      chapter_link = li.at_css('a')
      next unless chapter_link

      # Lấy URL chương
      chapter_url = chapter_link['href']
      # Đảm bảo URL đầy đủ
      chapter_url = URI.join(manga_url, chapter_url).to_s unless chapter_url.start_with?('http')

      # Lấy tiêu đề chương
      chapter_title = chapter_link.text.strip

      # Lấy số chương
      chapter_number_match = chapter_title.match(/Chapter\s+(\d+(\.\d+)?)/i)
      chapter_number = chapter_number_match ? chapter_number_match[1].to_f : nil

      # Lấy ngày đăng
      chapter_date = li.at_css('.col-xs-4')&.text&.strip

      chapters << {
        url: chapter_url,
        title: chapter_title,
        number: chapter_number,
        date: chapter_date
      }
    end

    # Log thông tin về chapters
    Rails.logger.info "Found #{chapters.size} chapters from source"
    Rails.logger.info "First 5 chapters from source: #{chapters.take(5).map { |c| "#{c[:title]} (#{c[:number]})" }.join(', ')}"

    # KHÔNG sắp xếp lại chapters, giữ nguyên thứ tự từ trang web (mới nhất trước)
    # Trên NetTruyen, chapters được hiển thị từ mới nhất đến cũ nhất
    chapters
  end

  # Crawl một chương cụ thể
  def self.crawl_chapter(manga, chapter_data)
    begin
      # Kiểm tra xem chương đã tồn tại chưa
      existing_chapter = manga.chapters.find_by(number: chapter_data[:number])
      if existing_chapter
        return {
          status: 'skipped',
          url: chapter_data[:url],
          title: chapter_data[:title],
          number: chapter_data[:number],
          message: 'Chapter already exists'
        }
      end

      # Log thông tin chapter đang crawl
      Rails.logger.info "Crawling chapter #{chapter_data[:number]} from URL: #{chapter_data[:url]}"

      # Lấy hình ảnh từ URL chương
      image_urls = ImageExtractorService.extract_from_url(chapter_data[:url])

      # Log số lượng hình ảnh tìm được
      Rails.logger.info "Found #{image_urls.size} images for chapter #{chapter_data[:number]}"

      if image_urls.empty?
        Rails.logger.error "No images found for chapter #{chapter_data[:number]} at URL: #{chapter_data[:url]}"
        return {
          status: 'error',
          url: chapter_data[:url],
          title: chapter_data[:title],
          number: chapter_data[:number],
          message: 'No images found'
        }
      end

      # Tạo chương mới
      chapter = manga.chapters.new(
        title: chapter_data[:title],
        number: chapter_data[:number] || 0
      )

      if chapter.save
        # Log thông tin chapter đã được tạo
        Rails.logger.info "Created chapter #{chapter.number} with ID: #{chapter.id}"

        # Chuẩn bị mảng dữ liệu ảnh
        image_data_array = image_urls.map.with_index do |image_url, position|
          {
            external_url: image_url,
            position: position,
            is_external: true
          }
        end

        # Thêm tất cả ảnh cùng một lúc (chỉ 1 lần cập nhật database)
        chapter.add_images(image_data_array)

        # Log thông tin số lượng ảnh đã thêm
        Rails.logger.info "Added #{image_urls.size} images to chapter #{chapter.number} in a single database update"

        {
          status: 'success',
          url: chapter_data[:url],
          title: chapter_data[:title],
          number: chapter_data[:number],
          chapter_id: chapter.id,
          image_count: image_urls.size
        }
      else
        Rails.logger.error "Failed to save chapter #{chapter_data[:number]}: #{chapter.errors.full_messages.join(', ')}"
        {
          status: 'error',
          url: chapter_data[:url],
          title: chapter_data[:title],
          number: chapter_data[:number],
          message: chapter.errors.full_messages.join(', ')
        }
      end
    rescue => e
      Rails.logger.error "Error crawling chapter #{chapter_data[:url]}: #{e.message}"
      Rails.logger.error e.backtrace.join("\n")
      {
        status: 'error',
        url: chapter_data[:url],
        title: chapter_data[:title],
        number: chapter_data[:number],
        message: e.message
      }
    end
  end

  # Tìm hoặc tạo manga từ thông tin crawl được
  def self.find_or_create_manga(manga_info)
    # Tìm manga theo tiêu đề
    manga = Manga.find_by("lower(title) = ?", manga_info[:title].downcase)

    # Nếu không tìm thấy, tạo mới
    unless manga
      manga = Manga.new(
        title: manga_info[:title],
        description: manga_info[:description],
        author: manga_info[:author],
        status: map_status(manga_info[:status]),
        source_url: manga_info[:source_url]
      )

      # Thêm thể loại nếu có
      if manga_info[:genres].present?
        manga_info[:genres].each do |genre_name|
          genre = Genre.find_or_create_by(name: genre_name)
          manga.genres << genre unless manga.genres.include?(genre)
        end
      end

      # Lưu manga
      manga.save

      # Tải và lưu ảnh bìa nếu có
      if manga_info[:cover_image].present?
        download_and_attach_cover(manga, manga_info[:cover_image])
      end
    end

    manga
  end

  # Map trạng thái từ NetTruyen sang trạng thái của hệ thống
  def self.map_status(status_text)
    return 'ongoing' unless status_text

    case status_text.downcase
    when /đang tiến hành/i, /updating/i, /ongoing/i
      'ongoing'
    when /đã hoàn thành/i, /completed/i
      'completed'
    when /tạm ngưng/i, /hiatus/i
      'hiatus'
    else
      'unknown'
    end
  end

  # Tải và đính kèm ảnh bìa
  def self.download_and_attach_cover(manga, cover_url)
    begin
      # Kiểm tra và đảm bảo URL hợp lệ
      unless cover_url.start_with?('http://', 'https://')
        Rails.logger.error "Invalid cover URL format: #{cover_url}"
        return
      end

      # Sử dụng remote_cover_image_url của CarrierWave thay vì attach của Active Storage
      manga.remote_cover_image_url = cover_url
      manga.use_remote_url = true

      # Lưu manga để tải ảnh bìa
      if manga.save
        Rails.logger.info "Successfully set remote cover image URL: #{cover_url}"
      else
        Rails.logger.error "Failed to save manga with remote cover image: #{manga.errors.full_messages.join(', ')}"
      end
    rescue URI::InvalidURIError => e
      Rails.logger.error "Invalid URI error: #{e.message} for URL: #{cover_url}"
    rescue => e
      Rails.logger.error "Error downloading cover image: #{e.message} for URL: #{cover_url}"
    end
  end

  # Fetch HTML với retry và các header giả lập browser
  def self.fetch_html_with_retry(url, retries = 0)
    begin
      uri = URI.parse(url)
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = (uri.scheme == 'https')
      http.verify_mode = OpenSSL::SSL::VERIFY_NONE if Rails.env.development?

      # Set timeout
      http.open_timeout = 10
      http.read_timeout = 20

      # Tạo request
      request = Net::HTTP::Get.new(uri.request_uri)

      # Thêm các header để giả lập browser
      request['User-Agent'] = random_user_agent
      request['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      request['Accept-Language'] = 'en-US,en;q=0.5'
      request['Connection'] = 'keep-alive'
      request['Upgrade-Insecure-Requests'] = '1'
      request['Cache-Control'] = 'max-age=0'
      request['Referer'] = "https://#{uri.host}/"

      # Gửi request và nhận response
      response = http.request(request)

      if response.code == '200'
        return response.body
      else
        raise "HTTP Error: #{response.code} - #{response.message}"
      end
    rescue => e
      if retries < MAX_RETRIES
        # Tăng thời gian delay theo số lần retry
        sleep(rand(2 * (retries + 1)..5 * (retries + 1)))
        return fetch_html_with_retry(url, retries + 1)
      else
        Rails.logger.error "Failed to fetch HTML after #{MAX_RETRIES} retries: #{e.message}"
        raise e
      end
    end
  end

  # Tạo User-Agent ngẫu nhiên
  def self.random_user_agent
    user_agents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1'
    ]
    user_agents.sample
  end
end
