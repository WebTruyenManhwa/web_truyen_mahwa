require 'net/http'
require 'uri'

class ImageExtractorService
  def self.extract_from_url(url)
    html = fetch_html(url)
    return [] unless html

    image_urls = []

    # Extract based on the source website
    if url.include?('nettruyen') || url.include?('nettruyenmax')
      image_urls = extract_nettruyen_images(html, url)
    elsif url.include?('truyenvn.shop')
      image_urls = extract_truyenvn_images(html, url)
    elsif url.include?('hentaivn') || url.include?('henzz.xyz')
      image_urls = extract_hentaivn_images(html, url)
    elsif url.include?('manhuavn') || url.include?('g5img.top')
      image_urls = extract_manhuavn_images(html, url)
    else
      # Generic extraction for other sites
      image_urls = extract_generic_images(html, url)
    end

    # Remove duplicates and normalize URLs
    image_urls.map { |url| url.split('?')[0] }.uniq
  end

  def self.fetch_html(url)
    uri = URI.parse(url)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = (uri.scheme == 'https')
    http.verify_mode = OpenSSL::SSL::VERIFY_NONE if Rails.env.development?

    request = Net::HTTP::Get.new(uri.request_uri)
    request['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    request['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'

    response = http.request(request)
    return response.body if response.code == '200'

    nil
  rescue => e
    Rails.logger.error("Error fetching HTML from #{url}: #{e.message}")
    nil
  end

  def self.extract_nettruyen_images(html, url)
    image_urls = []

    # Extract chapter number for filtering
    chapter_match = url.match(/(?:chapter|chuong)-(\d+)/i)
    chapter_num = chapter_match ? chapter_match[1] : nil

    # Extract chapter ID from URL
    chapter_id_match = url.match(/\/chapter-(\d+)(?:\/|$)/)
    chapter_id = chapter_id_match ? chapter_id_match[1] : nil

    # Tìm CHAPTER_ID từ JavaScript trong trang
    js_chapter_id_match = html.match(/const\s+CHAPTER_ID\s*=\s*(\d+);/)
    js_chapter_id = js_chapter_id_match ? js_chapter_id_match[1] : nil

    # Sử dụng chapter ID từ JavaScript nếu có, nếu không thì dùng từ URL
    chapter_id = js_chapter_id || chapter_id

    # Log URL và chapter number để debug
    Rails.logger.info "Extracting images from URL: #{url}, Chapter: #{chapter_num}, Chapter ID: #{chapter_id}"

    # Ưu tiên tìm hình ảnh từ div với ID 666ba3873e2ea221c3367e4067744da06bb
    # Đây là div chứa nội dung chính của chapter theo gợi ý của người dùng
    special_div_regex = /<div[^>]*class="[^"]*reading-detail[^"]*"[^>]*id="666ba3873e2ea221c3367e4067744da06bb"[^>]*>(.*?)<\/div><script/im
    if special_div_match = html.match(special_div_regex)
      special_div_content = special_div_match[1]
      Rails.logger.info "Found special div with ID 666ba3873e2ea221c3367e4067744da06bb"

      # Tìm tất cả các div với class="page-chapter"
      page_chapter_regex = /<div[^>]*class="[^"]*page-chapter[^"]*"[^>]*>(.*?)<\/div>/im
      page_chapters = special_div_content.scan(page_chapter_regex)

      # Tìm tất cả các thẻ img trong các div page-chapter
      page_chapters.each do |page_chapter|
        img_regex = /<img[^>]+(?:src|data-src|data-original)="([^">]+)"[^>]*>/
        if img_match = page_chapter[0].match(img_regex)
          img_src = img_match[1]

          # Skip obvious non-chapter images, base64 images và các hình ảnh tmp
          next if img_src.include?('logo') ||
                  img_src.include?('banner') ||
                  img_src.include?('icon') ||
                  img_src.include?('tmp/0.png') ||
                  img_src.include?('tmp/1.png') ||
                  img_src.include?('tmp/2.png') ||
                  img_src.include?('tmp/3.png') ||
                  img_src.include?('tmp/4.png') ||
                  img_src.include?('tmp/5.png') ||
                  img_src.include?('tmp/6.png') ||
                  img_src.include?('tmp/7.png') ||
                  img_src.include?('tmp/8.png') ||
                  img_src.include?('tmp/9.png') ||
                  img_src.include?('ads') ||
                  img_src.include?('facebook') ||
                  img_src.include?('fbcdn') ||
                  img_src.include?('avatar') ||
                  img_src.include?('thumbnail') ||
                  img_src.include?('netcdn.one/tmp') ||
                  img_src.start_with?('data:') ||
                  img_src.include?('prntscr.com') ||
                  img_src.include?('imgur.com') ||
                  img_src.include?('blogspot.com')

          # Ưu tiên URL có pattern i2.netcdn.one/ch/CHAPTER_ID
          if img_src.include?("i2.netcdn.one/ch/#{chapter_id}/")
            image_urls.unshift(img_src)
          else
            image_urls << img_src
          end
        end
      end

      Rails.logger.info "Found #{image_urls.length} images from special div"

      # Nếu tìm thấy đủ hình ảnh từ special div, trả về kết quả ngay
      if image_urls.length >= 10
        # Sắp xếp theo số thứ tự hình ảnh
        sorted_urls = image_urls.select { |url| url.include?("i2.netcdn.one/ch/#{chapter_id}/") }.sort_by do |url|
          match = url.match(/\/(\d+)\.(jpg|png|webp|jpeg)/)
          match ? match[1].to_i : 9999
        end

        if sorted_urls.length >= 10
          Rails.logger.info "Using #{sorted_urls.length} sorted images from special div"
          return sorted_urls
        end
      end
    end

    # Kiểm tra xem có AJAX request để lấy danh sách hình ảnh không
    if chapter_id.present?
      Rails.logger.info "Found chapter ID: #{chapter_id}, attempting to fetch images via AJAX"

      # Tạo AJAX request để lấy danh sách hình ảnh
      ajax_url = "https://nettruyen1905.com/ajax/image/list/chap/#{chapter_id}?fell=123ba3873e2ea221c3367e4067744da06bb"

      # Thêm headers để giả lập browser
      headers = {
        'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer' => url,
        'Accept' => 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With' => 'XMLHttpRequest'
      }

      ajax_response = fetch_html_with_headers(ajax_url, headers)

      if ajax_response.present?
        # Phân tích JSON response
        begin
          json_response = JSON.parse(ajax_response)

          if json_response['status'] && json_response['html'].present?
            ajax_html = json_response['html']

            # Tìm tất cả các div với class="page-chapter"
            page_chapter_regex = /<div[^>]*class="[^"]*page-chapter[^"]*"[^>]*>(.*?)<\/div>/im
            page_chapters = ajax_html.scan(page_chapter_regex)

            # Tìm tất cả các thẻ img trong các div page-chapter
            page_chapters.each do |page_chapter|
              img_regex = /<img[^>]+(?:src|data-src|data-original)="([^">]+)"[^>]*>/
              if img_match = page_chapter[0].match(img_regex)
                img_src = img_match[1]

                # Skip obvious non-chapter images, base64 images và các hình ảnh tmp
                next if img_src.include?('logo') ||
                        img_src.include?('banner') ||
                        img_src.include?('icon') ||
                        img_src.include?('tmp/0.png') ||
                        img_src.include?('tmp/1.png') ||
                        img_src.include?('tmp/2.png') ||
                        img_src.include?('tmp/3.png') ||
                        img_src.include?('tmp/4.png') ||
                        img_src.include?('tmp/5.png') ||
                        img_src.include?('tmp/6.png') ||
                        img_src.include?('tmp/7.png') ||
                        img_src.include?('tmp/8.png') ||
                        img_src.include?('tmp/9.png') ||
                        img_src.include?('ads') ||
                        img_src.include?('facebook') ||
                        img_src.include?('fbcdn') ||
                        img_src.include?('avatar') ||
                        img_src.include?('thumbnail') ||
                        img_src.include?('netcdn.one/tmp') ||
                        img_src.start_with?('data:') ||
                        img_src.include?('prntscr.com') ||
                        img_src.include?('imgur.com') ||
                        img_src.include?('blogspot.com')

                # Ưu tiên URL có pattern i2.netcdn.one/ch/CHAPTER_ID
                if img_src.include?("i2.netcdn.one/ch/#{chapter_id}/")
                  image_urls.unshift(img_src)
                else
                  image_urls << img_src
                end
              end
            end

            Rails.logger.info "Found #{image_urls.length} images from AJAX response"

            # Nếu tìm thấy đủ hình ảnh từ AJAX response, trả về kết quả ngay
            if image_urls.length >= 10
              # Sắp xếp theo số thứ tự hình ảnh
              sorted_urls = image_urls.select { |url| url.include?("i2.netcdn.one/ch/#{chapter_id}/") }.sort_by do |url|
                match = url.match(/\/(\d+)\.(jpg|png|webp|jpeg)/)
                match ? match[1].to_i : 9999
              end

              if sorted_urls.length >= 10
                Rails.logger.info "Using #{sorted_urls.length} sorted images from AJAX response"
                return sorted_urls
              end
            end
          end
        rescue => e
          Rails.logger.error "Error parsing AJAX response: #{e.message}"
        end
      end
    end

    # Nếu không tìm thấy hình ảnh từ AJAX, thử tìm trong HTML trang
    if image_urls.empty?
      # Tìm thẻ div với class="reading-detail box_doc" hoặc class="reading-detail"
      # Đây thường là container chứa các hình ảnh chính của chapter
      reading_detail_regex = /<div[^>]*class="[^"]*(?:reading-detail|box_doc)[^"]*"[^>]*>(.*?)<\/div>/im
      if reading_detail_match = html.match(reading_detail_regex)
        reading_detail_html = reading_detail_match[1]

        # Tìm tất cả các thẻ img trong phần reading-detail
        detail_img_regex = /<img[^>]+(?:src|data-src|data-original)="([^">]+)"[^>]*>/
        reading_detail_html.scan(detail_img_regex) do |match|
          img_src = match[0]

          # Skip obvious non-chapter images, base64 images và các hình ảnh tmp
          next if img_src.include?('logo') ||
                  img_src.include?('banner') ||
                  img_src.include?('icon') ||
                  img_src.include?('tmp/0.png') ||
                  img_src.include?('tmp/1.png') ||
                  img_src.include?('tmp/2.png') ||
                  img_src.include?('tmp/3.png') ||
                  img_src.include?('tmp/4.png') ||
                  img_src.include?('tmp/5.png') ||
                  img_src.include?('tmp/6.png') ||
                  img_src.include?('tmp/7.png') ||
                  img_src.include?('tmp/8.png') ||
                  img_src.include?('tmp/9.png') ||
                  img_src.include?('ads') ||
                  img_src.include?('facebook') ||
                  img_src.include?('fbcdn') ||
                  img_src.include?('avatar') ||
                  img_src.include?('thumbnail') ||
                  img_src.include?('netcdn.one/tmp') ||
                  img_src.start_with?('data:') ||
                  img_src.include?('prntscr.com') ||
                  img_src.include?('imgur.com') ||
                  img_src.include?('blogspot.com')

          # Thêm vào danh sách với ưu tiên cao
          image_urls.unshift(img_src) unless image_urls.include?(img_src)
        end
      end

      # Find all image tags
      img_regex = /<img[^>]+(?:src|data-src|data-original)="([^">]+)"[^>]*>/
      html.scan(img_regex) do |match|
        img_src = match[0]

        # Skip obvious non-chapter images, base64 images và các hình ảnh tmp
        next if img_src.include?('logo') ||
                img_src.include?('banner') ||
                img_src.include?('icon') ||
                img_src.include?('tmp/0.png') ||
                img_src.include?('tmp/1.png') ||
                img_src.include?('tmp/2.png') ||
                img_src.include?('tmp/3.png') ||
                img_src.include?('tmp/4.png') ||
                img_src.include?('tmp/5.png') ||
                img_src.include?('tmp/6.png') ||
                img_src.include?('tmp/7.png') ||
                img_src.include?('tmp/8.png') ||
                img_src.include?('tmp/9.png') ||
                img_src.include?('ads') ||
                img_src.include?('facebook') ||
                img_src.include?('fbcdn') ||
                img_src.include?('avatar') ||
                img_src.include?('thumbnail') ||
                img_src.include?('netcdn.one/tmp') ||
                img_src.start_with?('data:') ||
                img_src.include?('prntscr.com') ||
                img_src.include?('imgur.com') ||
                img_src.include?('blogspot.com')

        image_urls << img_src
      end

      # Also look for data-src and data-original attributes
      data_attr_regex = /data-(?:src|original)="([^"]+)"/
      html.scan(data_attr_regex) do |match|
        img_src = match[0]

        # Only include image files and skip temporary images and base64 images
        if (img_src.include?('.jpg') ||
            img_src.include?('.jpeg') ||
            img_src.include?('.png') ||
            img_src.include?('.webp') ||
            img_src.include?('.gif')) &&
           !img_src.include?('tmp/0.png') &&
           !img_src.include?('tmp/1.png') &&
           !img_src.include?('tmp/2.png') &&
           !img_src.include?('tmp/3.png') &&
           !img_src.include?('tmp/4.png') &&
           !img_src.include?('tmp/5.png') &&
           !img_src.include?('tmp/6.png') &&
           !img_src.include?('tmp/7.png') &&
           !img_src.include?('tmp/8.png') &&
           !img_src.include?('tmp/9.png') &&
           !img_src.include?('netcdn.one/tmp') &&
           !img_src.start_with?('data:') &&
           !img_src.include?('prntscr.com') &&
           !img_src.include?('imgur.com') &&
           !img_src.include?('blogspot.com')

          image_urls << img_src
        end
      end
    end

    # KHÔNG tự tạo URL dựa trên pattern đã biết nữa, chỉ sử dụng các URL đã tìm thấy trong HTML

    # Filter by common patterns if we have a chapter number
    if chapter_num && !image_urls.empty?
      patterns = [
        "/ch/#{chapter_num}/",
        "/chapter-#{chapter_num}/",
        "/chuong-#{chapter_num}/",
        "/chap-#{chapter_num}/",
        "/ch-#{chapter_num}/",
        "/#{chapter_num}.",
        "/#{chapter_num}-",
        "/#{chapter_num}/",
        "chapter-#{chapter_num}",
        "chap-#{chapter_num}",
        "ntcdn",
        "netcdn",
        "truyenvua.com",
        "nettruyen",
        "truyenqq"
      ]

      filtered_urls = image_urls.select do |url|
        # Skip social media, ads, temporary images and base64 images
        next false if url.include?('facebook') ||
                      url.include?('fbcdn') ||
                      url.include?('ads') ||
                      url.include?('banner') ||
                      url.include?('logo') ||
                      url.include?('icon') ||
                      url.include?('avatar') ||
                      url.include?('tmp/0.png') ||
                      url.include?('tmp/1.png') ||
                      url.include?('tmp/2.png') ||
                      url.include?('tmp/3.png') ||
                      url.include?('tmp/4.png') ||
                      url.include?('tmp/5.png') ||
                      url.include?('tmp/6.png') ||
                      url.include?('tmp/7.png') ||
                      url.include?('tmp/8.png') ||
                      url.include?('tmp/9.png') ||
                      url.include?('thumbnail') ||
                      url.include?('netcdn.one/tmp') ||
                      url.start_with?('data:') ||
                      url.include?('prntscr.com') ||
                      url.include?('imgur.com') ||
                      url.include?('blogspot.com')

        # Prioritize URLs with chapter patterns
        patterns.any? { |pattern| url.include?(pattern) }
      end

      # Use filtered URLs if we found any, otherwise use all image URLs
      image_urls = filtered_urls.any? ? filtered_urls : image_urls

      # Thêm logic tìm pattern nhất quán như trong frontend
      if filtered_urls.length > 0
        # Kiểm tra xem có pattern nhất quán không
        common_patterns = [
          /\/ch\/\d+\/\d+\.(jpg|png|webp|jpeg)/i,
          /\/images\/\d+\/\d+\.(jpg|png|webp|jpeg)/i,
          /\/chapter-\d+\/\d+\.(jpg|png|webp|jpeg)/i,
          # Thêm pattern cho NetTruyen
          /ntcdn\d+\.netcdn\.one.*\.(jpg|png|webp|jpeg)/i,
          /i\d+\.truyenvua\.com.*\.(jpg|png|webp|jpeg)/i,
          /\.netcdn\.one\/.*\/\d+\/\d+\.(jpg|png|webp|jpeg)/i,
          # Thêm pattern mới
          /\/chapter-#{chapter_num}\/\d+\.(jpg|png|webp|jpeg)/i,
          /\/chapter-#{chapter_num}-\d+\.(jpg|png|webp|jpeg)/i,
          # Pattern cho NetTruyen
          /i\d+\.netcdn\.one\/ch\/\d+\/\d+\.(jpg|png|webp|jpeg)/i,
          # Pattern chính xác cho chapter hiện tại
          /i\d+\.netcdn\.one\/ch\/#{chapter_id}\/\d+\.(jpg|png|webp|jpeg)/i
        ]

        found_consistent_pattern = false
        best_match_urls = []

        common_patterns.each do |pattern|
          matching_urls = filtered_urls.select { |url| pattern.match?(url) }
          if matching_urls.length >= 3 # Nếu có ít nhất 3 ảnh cùng pattern
            # Lấy pattern có nhiều ảnh nhất
            if matching_urls.length > best_match_urls.length
              best_match_urls = matching_urls
              found_consistent_pattern = true
            end
          end
        end

        # Nếu tìm thấy pattern nhất quán, sử dụng nó
        if found_consistent_pattern
          Rails.logger.info "Found consistent pattern with #{best_match_urls.length} images"
          image_urls = best_match_urls
        else
          # Nếu không tìm thấy pattern nhất quán, sử dụng tất cả các URL đã lọc
          # nhưng loại bỏ các URL trùng lặp sau khi chuẩn hóa
          normalized_urls = Set.new
          filtered_urls.each do |url|
            if url && url.is_a?(String)
              normalized_url = url.split('?')[0]
              normalized_urls.add(normalized_url)
            end
          end
          image_urls = normalized_urls.to_a
        end
      end
    end

    # Lọc bỏ tất cả các URL có chứa /tmp/ và base64 images
    image_urls = image_urls.reject { |url| url.include?('/tmp/') || url.start_with?('data:') }

    # Kiểm tra xem có URL nào chứa imgur hoặc blogspot không, nếu có, loại bỏ chúng
    # Đây thường là hình ảnh quảng cáo hoặc placeholder
    image_urls = image_urls.reject { |url| url.include?('imgur.com') || url.include?('blogspot.com') || url.include?('prntscr.com') }

    # Chỉ giữ lại các URL hình ảnh thực sự
    image_urls = image_urls.select do |url|
      url.include?('.jpg') ||
      url.include?('.jpeg') ||
      url.include?('.png') ||
      url.include?('.webp') ||
      url.include?('.gif')
    end

    # Nếu tìm thấy hình ảnh có pattern i2.netcdn.one/ch/CHAPTER_ID, ưu tiên chúng
    netcdn_pattern = /i\d+\.netcdn\.one\/ch\/#{chapter_id}\/\d+\.(jpg|png|webp|jpeg)/i
    netcdn_urls = image_urls.select { |url| netcdn_pattern.match?(url) }

    if netcdn_urls.any?
      # Sắp xếp theo số thứ tự hình ảnh
      sorted_netcdn_urls = netcdn_urls.sort_by do |url|
        # Trích xuất số thứ tự từ URL
        match = url.match(/\/(\d+)\.(jpg|png|webp|jpeg)/)
        match ? match[1].to_i : 9999
      end

      # Chỉ sử dụng các URL từ netcdn nếu có đủ số lượng
      if sorted_netcdn_urls.length >= 10
        image_urls = sorted_netcdn_urls
      end
    end

    # Log số lượng hình ảnh tìm thấy
    Rails.logger.info "Found #{image_urls.length} images for chapter #{chapter_num}"

    # Log 5 URL đầu tiên để debug
    if image_urls.length > 0
      Rails.logger.info "Sample image URLs: #{image_urls.take(5).join(', ')}"
    end

    image_urls
  end

  def self.extract_truyenvn_images(html, url)
    image_urls = []

    # Look for images in div with class="page-break no-gaps" and img with class="wp-manga-chapter-img"
    regex = /page-break no-gaps[^>]*>[\s\n]*<img[^>]+src=\s*"([^">]+)"[^>]*class="[^"]*wp-manga-chapter-img[^"]*"/
    html.scan(regex) do |match|
      img_src = match[0]&.strip
      image_urls << img_src if img_src
    end

    # If no images found, try a more general approach
    if image_urls.empty?
      img_regex = /<img[^>]+src=\s*"([^">]+)"[^>]*class="[^"]*wp-manga-chapter-img[^"]*"/
      html.scan(img_regex) do |match|
        img_src = match[0]&.strip
        image_urls << img_src if img_src
      end
    end

    image_urls
  end

  def self.extract_hentaivn_images(html, url)
    image_urls = []

    # Find all image tags
    img_regex = /<img[^>]+(?:src|data-src|data-original)="([^">]+)"[^>]*>/
    html.scan(img_regex) do |match|
      img_src = match[0]

      # Skip obvious non-chapter images
      next if img_src.include?('logo') ||
              img_src.include?('banner') ||
              img_src.include?('icon') ||
              img_src.include?('avatar') ||
              img_src.include?('thumbnail')

      # Only include image files
      if img_src.include?('.jpg') ||
         img_src.include?('.jpeg') ||
         img_src.include?('.png') ||
         img_src.include?('.webp') ||
         img_src.include?('.gif')
        image_urls << img_src
      end
    end

    image_urls
  end

  def self.extract_manhuavn_images(html, url)
    image_urls = []

    # Find all image tags
    img_regex = /<img[^>]+(?:src|data-src|data-original)="([^">]+)"[^>]*>/
    html.scan(img_regex) do |match|
      img_src = match[0]

      # Skip obvious non-chapter images
      next if img_src.include?('logo') ||
              img_src.include?('banner') ||
              img_src.include?('icon') ||
              img_src.include?('avatar') ||
              img_src.include?('thumbnail')

      image_urls << img_src
    end

    # Also look for data-src and data-original attributes
    data_attr_regex = /data-(?:src|original)="([^"]+)"/
    html.scan(data_attr_regex) do |match|
      img_src = match[0]

      # Only include image files
      if img_src.include?('.jpg') ||
         img_src.include?('.jpeg') ||
         img_src.include?('.png') ||
         img_src.include?('.webp') ||
         img_src.include?('.gif')
        image_urls << img_src
      end
    end

    # Look for g5img.top URLs
    g5img_regex = /https:\/\/img\d+\.g5img\.top\/[^"'\s]+/
    html.scan(g5img_regex) do |match|
      image_urls << match
    end

    # Filter to only include image files and exclude social media/ads
    image_urls.select do |url|
      (url.include?('.jpg') ||
       url.include?('.jpeg') ||
       url.include?('.png') ||
       url.include?('.webp') ||
       url.include?('.gif')) &&
      !url.include?('facebook') &&
      !url.include?('fbcdn') &&
      !url.include?('ads')
    end
  end

  def self.extract_generic_images(html, base_url)
    image_urls = []
    uri = URI.parse(base_url)
    base_host = "#{uri.scheme}://#{uri.host}"

    # Find all image tags
    img_regex = /<img[^>]+(?:src|data-src|data-original)="([^">]+)"[^>]*>/
    html.scan(img_regex) do |match|
      img_src = match[0]

      # Skip obvious non-chapter images
      next if img_src.include?('logo') ||
              img_src.include?('banner') ||
              img_src.include?('icon') ||
              img_src.include?('avatar') ||
              img_src.include?('thumbnail') ||
              img_src.include?('small')

      # Convert relative URLs to absolute
      if img_src.start_with?('/')
        img_src = "#{base_host}#{img_src}"
      elsif !img_src.start_with?('http')
        img_src = "#{base_host}/#{img_src}"
      end

      image_urls << img_src
    end

    # Filter to only include image files
    image_urls.select do |url|
      url.include?('.jpg') ||
      url.include?('.jpeg') ||
      url.include?('.png') ||
      url.include?('.webp') ||
      url.include?('.gif')
    end
  end

  # Thêm hàm mới để fetch HTML với headers tùy chỉnh
  def self.fetch_html_with_headers(url, headers = {})
    uri = URI.parse(url)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = (uri.scheme == 'https')
    http.verify_mode = OpenSSL::SSL::VERIFY_NONE if Rails.env.development?

    request = Net::HTTP::Get.new(uri.request_uri)

    # Thêm headers
    headers.each do |key, value|
      request[key] = value
    end

    response = http.request(request)
    return response.body if response.code == '200'

    nil
  rescue => e
    Rails.logger.error("Error fetching HTML from #{url}: #{e.message}")
    nil
  end
end
