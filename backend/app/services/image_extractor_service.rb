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

    # Find all image tags
    img_regex = /<img[^>]+(?:src|data-src|data-original)="([^">]+)"[^>]*>/
    html.scan(img_regex) do |match|
      img_src = match[0]

      # Skip obvious non-chapter images
      next if img_src.include?('logo') ||
              img_src.include?('banner') ||
              img_src.include?('icon') ||
              img_src.include?('tmp/0.png') ||
              img_src.include?('tmp/1.png') ||
              img_src.include?('tmp/2.png') ||
              img_src.include?('ads') ||
              img_src.include?('facebook') ||
              img_src.include?('fbcdn') ||
              img_src.include?('avatar') ||
              img_src.include?('thumbnail')

      image_urls << img_src
    end

    # Also look for data-src and data-original attributes
    data_attr_regex = /data-(?:src|original)="([^"]+)"/
    html.scan(data_attr_regex) do |match|
      img_src = match[0]

      # Only include image files and skip temporary images
      if (img_src.include?('.jpg') ||
          img_src.include?('.jpeg') ||
          img_src.include?('.png') ||
          img_src.include?('.webp') ||
          img_src.include?('.gif')) &&
         !img_src.include?('tmp/0.png') &&
         !img_src.include?('tmp/1.png') &&
         !img_src.include?('tmp/2.png')

        image_urls << img_src
      end
    end

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
        'ntcdn',
        'netcdn',
        'truyenvua.com',
        'nettruyen',
        'truyenqq'
      ]

      filtered_urls = image_urls.select do |url|
        # Skip social media, ads, and temporary images
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
                      url.include?('thumbnail')

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
          /\.netcdn\.one\/.*\/\d+\/\d+\.(jpg|png|webp|jpeg)/i
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
end
