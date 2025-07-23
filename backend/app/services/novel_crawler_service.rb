require 'nokogiri'
require 'net/http'
require 'uri'
require 'cgi'

class NovelCrawlerService
  # Thời gian delay giữa các request để tránh bị chặn
  DEFAULT_DELAY = 2..5 # Delay ngẫu nhiên từ 2-5 giây
  MAX_RETRIES = 3 # Số lần thử lại tối đa khi request thất bại
  BATCH_SIZE = 50 # Số lượng chapters được insert cùng lúc

  # Crawl toàn bộ novel từ URL
  def self.crawl_novel(novel_url, options = {})
    # Kiểm tra URL hợp lệ - Điều chỉnh theo trang web nguồn novel
    unless novel_url.include?('truyenfull') || novel_url.include?('webtruyen')
      return { status: 'error', message: 'URL không được hỗ trợ. Chỉ hỗ trợ TruyenFull và WebTruyen.' }
    end

    begin
      # Chuẩn hóa options - chuyển đổi đệ quy tất cả các nested hash
      options = deep_symbolize_keys(options)

      # Log options ban đầu
      Rails.logger.info "Original options: #{options.inspect}"
      Rails.logger.info "Original max_chapters type: #{options[:max_chapters].class.name}, value: #{options[:max_chapters].inspect}"

      # Lấy thông tin novel
      novel_info = extract_novel_info(novel_url)

      # Lấy danh sách chương
      chapters = extract_chapter_list(novel_url)

      if chapters.empty?
        return { status: 'error', message: 'Không tìm thấy chương nào.' }
      end

      # Tạo novel nếu chưa tồn tại
      novel = find_or_create_novel(novel_info)

      # Preload tất cả chapter_numbers hiện có để tránh N+1 query
      existing_chapter_numbers = novel.novel_chapters.pluck(:chapter_number)
      Rails.logger.info "Preloaded #{existing_chapter_numbers.size} existing chapter numbers"

      # Xác định chương cao nhất hiện có trong database
      latest_chapter = existing_chapter_numbers.max || 0
      
      # Xử lý auto_next_chapters nếu được bật hoặc khi max_chapters là "all" và novel đã có chapter
      auto_next_chapters = [true, 'true'].include?(options[:auto_next_chapters])
      
      # Nếu max_chapters là "all" và novel đã có chapter, tự động bật auto_next_chapters
      if options[:max_chapters].to_s.downcase == "all" && latest_chapter > 0
        auto_next_chapters = true
        Rails.logger.info "Auto next chapters automatically enabled because max_chapters is 'all' and novel already has chapters (latest: #{latest_chapter})"
      end
      
      Rails.logger.info "Auto next chapters is: #{auto_next_chapters} (original value: #{options[:auto_next_chapters].inspect})"

      if auto_next_chapters
        # Lấy số chapter lớn nhất hiện tại trong database
        Rails.logger.info "Auto next chapters is enabled and max_chapters is present: #{options[:max_chapters]}"

        if latest_chapter > 0
          Rails.logger.info "Auto next chapters enabled. Latest chapter in database: #{latest_chapter}"
          Rails.logger.info "First 5 chapters from source (newest first): #{chapters.take(5).map { |c| "#{c[:title]} (#{c[:number]})" }.join(', ')}"

          # Lọc chapters chỉ lấy những chapter có số lớn hơn chapter mới nhất trong database
          new_chapters = chapters.select do |chapter|
            chapter_number = chapter[:number].to_i
            # Đảm bảo chapter_number không nil
            next false unless chapter_number > 0
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
          # Khi chưa có chapter nào trong database, sắp xếp chapters theo thứ tự tăng dần
          # để bắt đầu crawl từ chapter đầu tiên
          Rails.logger.info "No existing chapters found in database, will crawl from beginning"

          # Đảo ngược mảng chapters để lấy từ cũ đến mới
          sorted_chapters = chapters.sort_by { |c| c[:number] || 0 }

          Rails.logger.info "Sorting chapters in ascending order to start from the first chapter"
          Rails.logger.info "First 5 chapters after sorting (oldest first): #{sorted_chapters.take(5).map { |c| "#{c[:title]} (#{c[:number]})" }.join(', ')}"

          # Gán lại biến chapters
          chapters = sorted_chapters
        end
      # Xử lý chapter range nếu có
      elsif options[:chapter_range].present?
        start_chapter = options[:chapter_range][:start].to_i
        end_chapter = options[:chapter_range][:end].to_i

        Rails.logger.info "Filtering chapters with range: #{start_chapter} to #{end_chapter}"

        # Lọc chapters theo range
        filtered_chapters = chapters.select do |chapter|
          chapter_number = chapter[:number].to_i
          # Đảm bảo chapter_number không nil và nằm trong khoảng
          if chapter_number && chapter_number >= start_chapter && chapter_number <= end_chapter
            Rails.logger.info "Selected chapter in range: #{chapter[:title]} (#{chapter_number})"
            true
          else
            false
          end
        end

        # Log số lượng chapter tìm được
        Rails.logger.info "Found #{filtered_chapters.size} chapters in range #{start_chapter} to #{end_chapter}"

        if filtered_chapters.empty?
          Rails.logger.warn "⚠️ No chapters found in range #{start_chapter} to #{end_chapter}!"
          return { status: 'error', message: "No chapters found in range #{start_chapter} to #{end_chapter}" }
        end

        Rails.logger.info "Filtered chapters: #{filtered_chapters.map { |c| "#{c[:title]} (#{c[:number]})" }.join(', ')}"

        # Sắp xếp lại theo số chương tăng dần
        filtered_chapters = filtered_chapters.sort_by { |c| c[:number] || 0 }

        # Gán lại biến chapters
        chapters = filtered_chapters
      end

      # Số chương cần crawl
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

      # Kiểm tra xem có cần gộp chương không
      batch_chapters = [true, 'true'].include?(options[:batch_chapters])
      batch_size = options[:batch_size].to_i
      batch_size = 5 if batch_size < 2 # Đảm bảo batch_size ít nhất là 2

      # Log thông tin về batch chapters
      if batch_chapters
        Rails.logger.info "Batch chapters enabled with batch size: #{batch_size}"
      end

      # Kết quả crawl
      results = {
        novel: {
          id: novel.id,
          title: novel.title,
          total_chapters: chapters.size,
          crawled_chapters: 0
        },
        chapters: []
      }

      # Chuẩn bị mảng để lưu các chapters cần tạo hàng loạt
      chapters_to_create = []
      chapters_results = []

      # Xử lý gộp chương nếu được bật
      if batch_chapters && chapters_to_crawl.size > 1
        Rails.logger.info "Processing chapters in batches of #{batch_size}"
        
        # Chia chapters thành các nhóm theo batch_size
        chapters_to_crawl.each_slice(batch_size).each_with_index do |batch_chapters, batch_index|
          # Bỏ qua nếu không có chapter nào trong batch
          next if batch_chapters.empty?
          
          # Lấy thông tin chapter đầu và cuối trong batch
          first_chapter = batch_chapters.first
          last_chapter = batch_chapters.last
          
          # Tạo tiêu đề cho chương gộp
          batch_title = "Chương #{first_chapter[:number]}-#{last_chapter[:number]}"
          
          # Tạo slug cho chương gộp
          batch_slug = "chuong-#{first_chapter[:number]}-#{last_chapter[:number]}"
          
          # Kiểm tra xem chương gộp đã tồn tại chưa hoặc có chương nào trong batch đã tồn tại chưa
          if novel.novel_chapters.exists?(chapter_number: first_chapter[:number]) || 
             batch_chapters.any? { |ch| existing_chapter_numbers.include?(ch[:number].to_i) }
            batch_result = {
              status: 'skipped',
              title: batch_title,
              message: 'Batch chapter already exists or contains existing chapters'
            }
            chapters_results << batch_result
            next
          end
          
          # Nội dung gộp
          batch_content = "**Chương gộp từ #{first_chapter[:number]} đến #{last_chapter[:number]}**\n\n"
          
          # Crawl từng chương trong batch và gộp nội dung
          batch_chapters.each do |chapter_data|
            # Xử lý delay
            delay = options[:delay] || DEFAULT_DELAY
            if delay.is_a?(String) && delay.include?('..')
              start_delay, end_delay = delay.split('..').map(&:to_i)
              sleep_time = rand(start_delay..end_delay)
              Rails.logger.info "Sleeping for #{sleep_time} seconds (delay: #{delay})"
              sleep(sleep_time)
            else
              sleep(rand(delay))
            end
            
            # Crawl chương
            chapter_result = crawl_chapter_for_bulk_insert(novel, chapter_data)
            
            if chapter_result[:status] == 'success'
              # Thêm tiêu đề chương vào nội dung
              batch_content += "## #{chapter_data[:title]}\n\n"
              batch_content += chapter_result[:content]
              batch_content += "\n\n---\n\n" # Thêm dấu phân cách giữa các chương
            else
              # Ghi log lỗi nếu không crawl được chương
              Rails.logger.error "Failed to crawl chapter #{chapter_data[:number]} for batch: #{chapter_result[:message]}"
              batch_content += "## #{chapter_data[:title]}\n\n"
              batch_content += "*Không thể tải nội dung chương này.*\n\n"
              batch_content += "\n\n---\n\n"
            end
          end
          
          # Xử lý Markdown thành HTML
          rendered_html = NovelChapter.render_markdown_content(batch_content)
          
          # Thêm vào danh sách cần tạo hàng loạt
          chapters_to_create << {
            novel_series_id: novel.id,
            title: batch_title,
            chapter_number: first_chapter[:number],
            content: batch_content,
            rendered_html: rendered_html,
            slug: batch_slug,
            is_batch_chapter: true,
            batch_start: first_chapter[:number],
            batch_end: last_chapter[:number],
            created_at: Time.current,
            updated_at: Time.current
          }
          
          # Thêm kết quả batch vào kết quả
          chapters_results << {
            status: 'success',
            title: batch_title,
            number: first_chapter[:number],
            is_batch: true,
            batch_start: first_chapter[:number],
            batch_end: last_chapter[:number]
          }
          
          # Log tiến trình
          Rails.logger.info "Created batch chapter #{batch_index + 1} from chapters #{first_chapter[:number]}-#{last_chapter[:number]}"
        end
        
        # Bulk insert các chapters gộp
        if chapters_to_create.present?
          Rails.logger.info "Bulk inserting #{chapters_to_create.size} batch chapters"
          NovelChapter.insert_all(chapters_to_create)
          
          # Cập nhật số chương đã crawl
          results[:novel][:crawled_chapters] = chapters_to_create.size
        end
        
        # Thêm kết quả chapters vào results
        results[:chapters] = chapters_results
        
        # Trả về kết quả
        return results.merge(status: 'success')
      else
        # Crawl từng chương riêng lẻ nếu không gộp chương
        # Crawl từng chương và xử lý theo batch để tiết kiệm bộ nhớ
        chapters_to_crawl.each_slice(BATCH_SIZE).each_with_index do |batch_chapters, batch_index|
          batch_to_create = []
          batch_results = []

          batch_chapters.each_with_index do |chapter_data, index|
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

            # Kiểm tra xem chapter đã tồn tại chưa (sử dụng preloaded data)
            if existing_chapter_numbers.include?(chapter_data[:number])
              chapter_result = {
                status: 'skipped',
                url: chapter_data[:url],
                title: chapter_data[:title],
                number: chapter_data[:number],
                message: 'Chapter already exists'
              }
              batch_results << chapter_result
              next
            end

            # Crawl chương
            chapter_result = crawl_chapter_for_bulk_insert(novel, chapter_data)

            if chapter_result[:status] == 'success'
              # Xử lý Markdown thành HTML
              rendered_html = NovelChapter.render_markdown_content(chapter_result[:content])

              # Tạo slug từ title
              slug = generate_slug_for_chapter(chapter_data[:title], novel.id, chapter_data[:number])

              # Thêm vào danh sách cần tạo hàng loạt
              batch_to_create << {
                novel_series_id: novel.id,
                title: chapter_data[:title],
                chapter_number: chapter_data[:number],
                content: chapter_result[:content],
                rendered_html: rendered_html,
                slug: slug,
                created_at: Time.current,
                updated_at: Time.current
              }
            end

            batch_results << chapter_result

            # Log tiến trình
            Rails.logger.info "Crawled chapter #{batch_index * BATCH_SIZE + index + 1}/#{chapters_to_crawl.size} for novel '#{novel.title}'"
          end

          # Bulk insert các chapters mới trong batch hiện tại
          if batch_to_create.present?
            Rails.logger.info "Bulk inserting #{batch_to_create.size} new chapters for batch #{batch_index + 1}"
            NovelChapter.insert_all(batch_to_create)

            # Cập nhật existing_chapter_numbers để phản ánh các chapters mới
            new_chapter_numbers = batch_to_create.map { |c| c[:chapter_number] }
            existing_chapter_numbers.concat(new_chapter_numbers)

            # Cập nhật số chương đã crawl
            results[:novel][:crawled_chapters] += batch_to_create.size
          end

          # Thêm kết quả batch vào kết quả tổng
          chapters_results.concat(batch_results)

          # Giải phóng bộ nhớ
          batch_to_create = nil
          batch_results = nil
          GC.start if batch_index % 5 == 0 # Chạy GC sau mỗi 5 batch
        end

        # Thêm kết quả chapters vào results
        results[:chapters] = chapters_results

        # Trả về kết quả
        results.merge(status: 'success')
      end
    rescue => e
      Rails.logger.error "Error crawling novel: #{e.message}"
      Rails.logger.error e.backtrace.join("\n")
      { status: 'error', message: e.message }
    end
  end

  # Lấy thông tin novel từ URL
  def self.extract_novel_info(novel_url)
    html = fetch_html_with_retry(novel_url)
    doc = Nokogiri::HTML(html)

    # Xác định trang web nguồn để áp dụng selector phù hợp
    if novel_url.include?('truyenfull')
      # Selector cho TruyenFull
      title = doc.at_css('.title')&.text&.strip
      description = doc.at_css('#truyen .desc-text')&.text&.strip
      author = doc.at_css('.info a[itemprop="author"]')&.text&.strip
      genres = doc.css('.info a[itemprop="genre"]').map { |a| a.text.strip }
      
      # Cải thiện selector cho cover_image
      cover_image = doc.at_css('#truyen img.cover')&.attr('src')
      # Nếu không tìm thấy, thử selector khác cho truyenfull.vision
      if cover_image.blank?
        cover_image = doc.at_css('.books img')&.attr('src')
      end
      if cover_image.blank?
        cover_image = doc.at_css('.book img')&.attr('src')
      end
      if cover_image.blank?
        cover_image = doc.css('img').find { |img| img['alt']&.include?(title.to_s) }&.attr('src')
      end
      
      status = doc.at_css('.info .text-success')&.text&.strip
    elsif novel_url.include?('webtruyen')
      # Selector cho WebTruyen
      title = doc.at_css('.story-details h1.title')&.text&.strip
      description = doc.at_css('.story-details .description')&.text&.strip
      author = doc.at_css('.story-details .author a')&.text&.strip
      genres = doc.css('.story-details .categories a').map { |a| a.text.strip }
      cover_image = doc.at_css('.story-details .book img')&.attr('src')
      status = doc.at_css('.story-details .status')&.text&.strip
    else
      # Selector mặc định
      title = doc.at_css('h1')&.text&.strip
      description = doc.at_css('meta[name="description"]')&.attr('content')
      author = doc.at_css('.author')&.text&.strip
      genres = doc.css('.genre').map { |a| a.text.strip }
      cover_image = doc.at_css('.cover img')&.attr('src')
      status = doc.at_css('.status')&.text&.strip
    end

    # Đảm bảo URL ảnh bìa hợp lệ
    if cover_image.present?
      # Thêm schema nếu URL là relative
      unless cover_image.start_with?('http://', 'https://')
        if cover_image.start_with?('//')
          cover_image = "https:#{cover_image}"
        else
          # Lấy domain từ novel_url
          uri = URI.parse(novel_url)
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

      # Thử tải ảnh bìa để kiểm tra URL có hoạt động không
      begin
        uri = URI.parse(cover_image)
        http = Net::HTTP.new(uri.host, uri.port)
        http.use_ssl = (uri.scheme == 'https')
        http.verify_mode = OpenSSL::SSL::VERIFY_NONE # Bỏ qua xác thực SSL để tránh lỗi
        
        # Thêm timeout để tránh treo
        http.open_timeout = 5
        http.read_timeout = 5
        
        # Chỉ kiểm tra header, không tải toàn bộ ảnh
        request = Net::HTTP::Head.new(uri.request_uri)
        request['User-Agent'] = random_user_agent # Thêm User-Agent để tránh bị chặn
        
        # Thử GET request nếu HEAD không được hỗ trợ
        begin
          response = http.request(request)
        rescue => e
          Rails.logger.warn "HEAD request failed: #{e.message}, trying GET request"
          request = Net::HTTP::Get.new(uri.request_uri)
          request['User-Agent'] = random_user_agent
          response = http.request(request)
        end
        
        unless response.code.to_i.between?(200, 299)
          Rails.logger.warn "Cover image URL returned non-success status code: #{response.code} - #{cover_image}"
          cover_image = "https://via.placeholder.com/300x400?text=#{URI.encode_www_form_component(title || 'Novel')}"
        end
      rescue => e
        Rails.logger.error "Error checking cover image URL: #{e.message}"
        # Nếu có lỗi SSL hoặc timeout, vẫn giữ nguyên URL ảnh bìa vì có thể lỗi chỉ xảy ra ở server
        # Chỉ sử dụng ảnh placeholder nếu URL rõ ràng không hợp lệ
        if e.message.include?('getaddrinfo') || e.message.include?('SocketError') || e.message.include?('Invalid URI')
          cover_image = "https://via.placeholder.com/300x400?text=#{URI.encode_www_form_component(title || 'Novel')}"
        end
      end
    else
      # Nếu không tìm thấy ảnh bìa, sử dụng ảnh mặc định
      cover_image = "https://via.placeholder.com/300x400?text=#{URI.encode_www_form_component(title || 'Novel')}"
      Rails.logger.warn "No cover image found for novel, using placeholder: #{cover_image}"
    end

    {
      title: title,
      description: description,
      author: author,
      genres: genres,
      cover_image: cover_image,
      status: status,
      source_url: novel_url
    }
  end

  # Lấy hoặc tạo novel từ URL
  def self.get_or_create_novel_from_url(novel_url)
    # Kiểm tra URL hợp lệ
    unless novel_url.include?('truyenfull') || novel_url.include?('webtruyen')
      raise ArgumentError, 'URL không được hỗ trợ. Chỉ hỗ trợ TruyenFull và WebTruyen.'
    end

    # Lấy thông tin novel
    novel_info = extract_novel_info(novel_url)

    # Tìm hoặc tạo novel
    find_or_create_novel(novel_info)
  end

  # Lấy danh sách chương từ URL
  def self.extract_chapter_list(novel_url)
    html = fetch_html_with_retry(novel_url)
    doc = Nokogiri::HTML(html)
    chapters = []

    # Xác định trang web nguồn để áp dụng selector phù hợp
    if novel_url.include?('truyenfull')
      # Selector cho TruyenFull
      chapter_elements = doc.css('#list-chapter .list-chapter li a')

      chapter_elements.each_with_index do |a, index|
        chapter_url = a['href']
        # Đảm bảo URL đầy đủ
        chapter_url = URI.join(novel_url, chapter_url).to_s unless chapter_url.start_with?('http')

        chapter_title = a.text.strip
        # Lấy số chương từ tiêu đề
        chapter_number_match = chapter_title.match(/Chương\s+(\d+)/i)
        chapter_number = chapter_number_match ? chapter_number_match[1].to_i : index + 1

        chapters << {
          url: chapter_url,
          title: chapter_title,
          number: chapter_number
        }
      end
    elsif novel_url.include?('webtruyen')
      # Selector cho WebTruyen
      chapter_elements = doc.css('.list-chapters li a')

      chapter_elements.each_with_index do |a, index|
        chapter_url = a['href']
        # Đảm bảo URL đầy đủ
        chapter_url = URI.join(novel_url, chapter_url).to_s unless chapter_url.start_with?('http')

        chapter_title = a.text.strip
        # Lấy số chương từ tiêu đề
        chapter_number_match = chapter_title.match(/Chương\s+(\d+)/i)
        chapter_number = chapter_number_match ? chapter_number_match[1].to_i : index + 1

        chapters << {
          url: chapter_url,
          title: chapter_title,
          number: chapter_number
        }
      end
    else
      # Selector mặc định
      chapter_elements = doc.css('.chapter-list a')

      chapter_elements.each_with_index do |a, index|
        chapter_url = a['href']
        # Đảm bảo URL đầy đủ
        chapter_url = URI.join(novel_url, chapter_url).to_s unless chapter_url.start_with?('http')

        chapter_title = a.text.strip
        # Lấy số chương từ tiêu đề
        chapter_number_match = chapter_title.match(/Chương\s+(\d+)/i)
        chapter_number = chapter_number_match ? chapter_number_match[1].to_i : index + 1

        chapters << {
          url: chapter_url,
          title: chapter_title,
          number: chapter_number
        }
      end
    end

    # Log thông tin về chapters
    Rails.logger.info "Found #{chapters.size} chapters from source"
    Rails.logger.info "First 5 chapters from source: #{chapters.take(5).map { |c| "#{c[:title]} (#{c[:number]})" }.join(', ')}"

    chapters
  end

  # Crawl một chương cụ thể và trả về nội dung để bulk insert
  def self.crawl_chapter_for_bulk_insert(novel, chapter_data)
    begin
      # Log thông tin chapter đang crawl
      Rails.logger.info "Crawling chapter #{chapter_data[:number]} from URL: #{chapter_data[:url]}"

      # Lấy nội dung từ URL chương
      html = fetch_html_with_retry(chapter_data[:url])
      doc = Nokogiri::HTML(html)

      # Xác định trang web nguồn để áp dụng selector phù hợp
      if chapter_data[:url].include?('truyenfull')
        # Selector cho TruyenFull
        content_element = doc.at_css('#chapter-c')
      elsif chapter_data[:url].include?('webtruyen')
        # Selector cho WebTruyen
        content_element = doc.at_css('.chapter-content')
      else
        # Selector mặc định
        content_element = doc.at_css('.chapter-content')
      end

      # Lấy nội dung chapter
      if content_element
        # Loại bỏ các phần tử không mong muốn
        content_element.css('script, style, ins, .ads').each(&:remove)

        # Lấy nội dung HTML
        content = content_element.inner_html.strip

        # Xử lý nội dung (loại bỏ quảng cáo, định dạng lại, v.v.)
        content = clean_content(content)

        # Trả về kết quả thành công với nội dung
        return {
          status: 'success',
          url: chapter_data[:url],
          title: chapter_data[:title],
          number: chapter_data[:number],
          content: content
        }
      else
        Rails.logger.error "No content found for chapter #{chapter_data[:number]} at URL: #{chapter_data[:url]}"
        return {
          status: 'error',
          url: chapter_data[:url],
          title: chapter_data[:title],
          number: chapter_data[:number],
          message: 'No content found'
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

  # Crawl một chương cụ thể (giữ lại cho tương thích ngược)
  def self.crawl_chapter(novel, chapter_data)
    begin
      # Kiểm tra xem chương đã tồn tại chưa
      existing_chapter = novel.novel_chapters.find_by(chapter_number: chapter_data[:number])
      if existing_chapter
        return {
          status: 'skipped',
          url: chapter_data[:url],
          title: chapter_data[:title],
          number: chapter_data[:number],
          message: 'Chapter already exists'
        }
      end

      # Lấy nội dung chapter
      chapter_result = crawl_chapter_for_bulk_insert(novel, chapter_data)

      # Nếu không thành công, trả về kết quả lỗi
      unless chapter_result[:status] == 'success'
        return chapter_result
      end

      # Tạo chương mới
      chapter = novel.novel_chapters.new(
        title: chapter_data[:title],
        chapter_number: chapter_data[:number],
        content: chapter_result[:content]
      )

      if chapter.save
        # Log thông tin chapter đã được tạo
        Rails.logger.info "Created chapter #{chapter.chapter_number} with ID: #{chapter.id}"

        {
          status: 'success',
          url: chapter_data[:url],
          title: chapter_data[:title],
          number: chapter_data[:number],
          chapter_id: chapter.id
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

  # Làm sạch nội dung chapter
  def self.clean_content(content)
    # Loại bỏ các thẻ script, iframe
    content = content.gsub(/<script.*?<\/script>/im, '')
    content = content.gsub(/<iframe.*?<\/iframe>/im, '')

    # Loại bỏ các đoạn quảng cáo thường gặp
    content = content.gsub(/Truyện\s+VIP\s+.*?<\/div>/im, '')
    content = content.gsub(/Truyện\s+Full\s+.*?<\/div>/im, '')
    content = content.gsub(/Đọc\s+Truyện\s+.*?<\/div>/im, '')

    # Chuyển đổi các thẻ HTML thành Markdown hoặc text thuần túy
    # Chuyển <br>, <p> thành dòng mới
    content = content.gsub(/<br\s*\/?>/i, "\n")
    content = content.gsub(/<\/p>\s*<p>/im, "\n\n")
    content = content.gsub(/<p[^>]*>/i, '')
    content = content.gsub(/<\/p>/i, "\n\n")

    # Loại bỏ các liên kết không cần thiết
    content = content.gsub(/<a.*?>(.*?)<\/a>/im, '\1')

    # Loại bỏ các thuộc tính không cần thiết
    content = content.gsub(/\s+style="[^"]*"/i, '')
    content = content.gsub(/\s+class="[^"]*"/i, '')
    content = content.gsub(/\s+id="[^"]*"/i, '')

    # Loại bỏ các thẻ div không cần thiết nhưng giữ lại nội dung
    content = content.gsub(/<div[^>]*>(.*?)<\/div>/im, '\1')
    
    # Loại bỏ tất cả các thẻ HTML còn lại nhưng giữ lại nội dung
    content = content.gsub(/<[^>]*>/m, '')
    
    # Decode HTML entities
    content = CGI.unescapeHTML(content) rescue content

    # Thêm các định dạng cơ bản
    content = content.gsub(/\n{3,}/m, "\n\n") # Giảm số dòng trống

    content
  end

  # Tìm hoặc tạo novel từ thông tin crawl được
  def self.find_or_create_novel(novel_info)
    # Tạo slug thân thiện với tiếng Việt
    slug = create_vietnamese_friendly_slug(novel_info[:title])

    # Tìm novel theo tiêu đề
    novel = NovelSeries.find_by("lower(title) = ?", novel_info[:title].downcase)

    # Nếu không tìm thấy, tạo mới
    unless novel
      novel = NovelSeries.new(
        title: novel_info[:title],
        description: novel_info[:description],
        author: novel_info[:author],
        status: map_status(novel_info[:status]),
        cover_image: novel_info[:cover_image],
        source_url: novel_info[:source_url],
        slug: slug
      )

      # Lưu novel
      novel.save
    end

    novel
  end

  # Map trạng thái từ trang nguồn sang trạng thái của hệ thống
  def self.map_status(status_text)
    return 'ongoing' unless status_text

    case status_text.downcase
    when /đang tiến hành/i, /đang cập nhật/i, /updating/i, /ongoing/i
      'ongoing'
    when /đã hoàn thành/i, /hoàn thành/i, /full/i, /completed/i
      'completed'
    when /tạm ngưng/i, /hiatus/i
      'hiatus'
    else
      'ongoing'
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

  # Hàm đệ quy để chuyển đổi các key của hash thành symbol
  def self.deep_symbolize_keys(hash)
    return hash unless hash.is_a?(Hash)
    hash.transform_keys { |key| key.is_a?(String) ? key.to_sym : key }.transform_values { |value| deep_symbolize_keys(value) }
  end

  # Tạo slug cho chapter
  def self.generate_slug_for_chapter(title, novel_id, chapter_number = nil)
    # Tạo slug với định dạng "chuong-X"
    slug = "chuong-#{chapter_number}"
    
    # Đảm bảo slug không trùng lặp
    base_slug = slug
    counter = 1
    while NovelChapter.exists?(novel_series_id: novel_id, slug: slug)
      slug = "#{base_slug}-#{counter}"
      counter += 1
    end
    
    slug
  end

  # Tạo slug thân thiện với tiếng Việt
  def self.create_vietnamese_friendly_slug(text)
    return "" if text.blank?
    
    # Bảng chuyển đổi tiếng Việt sang không dấu
    vietnamese_chars = {
      'à' => 'a', 'á' => 'a', 'ạ' => 'a', 'ả' => 'a', 'ã' => 'a', 'â' => 'a', 'ầ' => 'a', 'ấ' => 'a', 'ậ' => 'a', 'ẩ' => 'a', 'ẫ' => 'a', 'ă' => 'a', 'ằ' => 'a', 'ắ' => 'a', 'ặ' => 'a', 'ẳ' => 'a', 'ẵ' => 'a',
      'è' => 'e', 'é' => 'e', 'ẹ' => 'e', 'ẻ' => 'e', 'ẽ' => 'e', 'ê' => 'e', 'ề' => 'e', 'ế' => 'e', 'ệ' => 'e', 'ể' => 'e', 'ễ' => 'e',
      'ì' => 'i', 'í' => 'i', 'ị' => 'i', 'ỉ' => 'i', 'ĩ' => 'i',
      'ò' => 'o', 'ó' => 'o', 'ọ' => 'o', 'ỏ' => 'o', 'õ' => 'o', 'ô' => 'o', 'ồ' => 'o', 'ố' => 'o', 'ộ' => 'o', 'ổ' => 'o', 'ỗ' => 'o', 'ơ' => 'o', 'ờ' => 'o', 'ớ' => 'o', 'ợ' => 'o', 'ở' => 'o', 'ỡ' => 'o',
      'ù' => 'u', 'ú' => 'u', 'ụ' => 'u', 'ủ' => 'u', 'ũ' => 'u', 'ư' => 'u', 'ừ' => 'u', 'ứ' => 'u', 'ự' => 'u', 'ử' => 'u', 'ữ' => 'u',
      'ỳ' => 'y', 'ý' => 'y', 'ỵ' => 'y', 'ỷ' => 'y', 'ỹ' => 'y',
      'đ' => 'd',
      'À' => 'A', 'Á' => 'A', 'Ạ' => 'A', 'Ả' => 'A', 'Ã' => 'A', 'Â' => 'A', 'Ầ' => 'A', 'Ấ' => 'A', 'Ậ' => 'A', 'Ẩ' => 'A', 'Ẫ' => 'A', 'Ă' => 'A', 'Ằ' => 'A', 'Ắ' => 'A', 'Ặ' => 'A', 'Ẳ' => 'A', 'Ẵ' => 'A',
      'È' => 'E', 'É' => 'E', 'Ẹ' => 'E', 'Ẻ' => 'E', 'Ẽ' => 'E', 'Ê' => 'E', 'Ề' => 'E', 'Ế' => 'E', 'Ệ' => 'E', 'Ể' => 'E', 'Ễ' => 'E',
      'Ì' => 'I', 'Í' => 'I', 'Ị' => 'I', 'Ỉ' => 'I', 'Ĩ' => 'I',
      'Ò' => 'O', 'Ó' => 'O', 'Ọ' => 'O', 'Ỏ' => 'O', 'Õ' => 'O', 'Ô' => 'O', 'Ồ' => 'O', 'Ố' => 'O', 'Ộ' => 'O', 'Ổ' => 'O', 'Ỗ' => 'O', 'Ơ' => 'O', 'Ờ' => 'O', 'Ớ' => 'O', 'Ợ' => 'O', 'Ở' => 'O', 'Ỡ' => 'O',
      'Ù' => 'U', 'Ú' => 'U', 'Ụ' => 'U', 'Ủ' => 'U', 'Ũ' => 'U', 'Ư' => 'U', 'Ừ' => 'U', 'Ứ' => 'U', 'Ự' => 'U', 'Ử' => 'U', 'Ữ' => 'U',
      'Ỳ' => 'Y', 'Ý' => 'Y', 'Ỵ' => 'Y', 'Ỷ' => 'Y', 'Ỹ' => 'Y',
      'Đ' => 'D'
    }
    
    # Chuyển đổi tiếng Việt sang không dấu
    normalized_text = text.dup
    vietnamese_chars.each do |vi_char, latin_char|
      normalized_text.gsub!(vi_char, latin_char)
    end
    
    # Tạo slug
    slug = normalized_text.downcase
                        .gsub(/[^a-z0-9\s-]/, '') # Loại bỏ ký tự đặc biệt
                        .gsub(/\s+/, '-')         # Thay khoảng trắng bằng dấu gạch ngang
                        .gsub(/-+/, '-')          # Loại bỏ nhiều dấu gạch ngang liên tiếp
                        .gsub(/^-|-$/, '')        # Loại bỏ dấu gạch ngang ở đầu và cuối
    
    # Đảm bảo slug không trùng lặp
    base_slug = slug
    counter = 1
    while NovelSeries.where(slug: slug).exists?
      slug = "#{base_slug}-#{counter}"
      counter += 1
    end
    
    slug
  end
end
