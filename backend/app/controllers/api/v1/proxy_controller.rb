require 'net/http'
require 'uri'

class Api::V1::ProxyController < Api::V1::BaseController
  skip_before_action :authenticate_user!, only: [:fetch_url]
  before_action :authenticate_admin!, only: [:batch_import_chapters]

  # GET /api/v1/proxy/fetch?url=https://example.com
  def fetch_url
    url = params[:url]
    
    unless url.present?
      return render json: { error: 'URL parameter is required' }, status: :bad_request
    end
    
    begin
      uri = URI.parse(url)
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = (uri.scheme == 'https')
      
      # Skip SSL verification (IMPORTANT: In production, this should be properly configured)
      http.verify_mode = OpenSSL::SSL::VERIFY_NONE if Rails.env.development?
      
      # Set a reasonable timeout
      http.open_timeout = 10
      http.read_timeout = 10
      
      # Create the request object
      request = Net::HTTP::Get.new(uri.request_uri)
      
      # Add common headers to make the request look legitimate
      request['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      request['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      request['Accept-Language'] = 'en-US,en;q=0.5'
      request['Connection'] = 'keep-alive'
      request['Upgrade-Insecure-Requests'] = '1'
      request['Cache-Control'] = 'max-age=0'
      
      # Send the request and get the response
      response = http.request(request)
      
      # Return the response with appropriate headers
      render plain: response.body, content_type: response['Content-Type']
    rescue => e
      Rails.logger.error("Proxy error: #{e.message}")
      render json: { error: "Failed to fetch URL: #{e.message}" }, status: :internal_server_error
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
    auto_number = params.fetch(:auto_number, true)
    start_number = params.fetch(:start_number, 1).to_f
    
    unless manga_id.present? && urls.present? && urls.is_a?(Array)
      return render json: { error: 'manga_id and urls array are required' }, status: :bad_request
    end
    
    # Find the manga
    manga = Manga.find_by(id: manga_id)
    unless manga
      return render json: { error: 'Manga not found' }, status: :not_found
    end
    
    results = []
    
    urls.each_with_index do |url, index|
      begin
        # Extract chapter number from URL if possible
        chapter_number = extract_chapter_number(url)
        
        # If auto_number is true or no chapter number was extracted, use the index-based number
        if auto_number || chapter_number.nil?
          chapter_number = start_number + index
        end
        
        # Extract chapter title if possible
        chapter_title = extract_chapter_title(url)
        
        # Create a default title if none was extracted
        chapter_title ||= "Chapter #{chapter_number}"
        
        # Extract images from the URL
        image_urls = extract_images_from_url(url)
        
        if image_urls.empty?
          results << { url: url, status: 'error', message: 'No images found' }
          next
        end
        
        # Create the chapter
        chapter = manga.chapters.new(
          title: chapter_title,
          number: chapter_number
        )
        
        if chapter.save
          # Add images to the chapter
          image_urls.each_with_index do |image_url, position|
            chapter.chapter_images.create(
              external_url: image_url,
              position: position,
              is_external: true
            )
          end
          
          results << { 
            url: url, 
            status: 'success', 
            chapter_id: chapter.id, 
            title: chapter_title, 
            number: chapter_number,
            image_count: image_urls.length
          }
        else
          results << { url: url, status: 'error', message: chapter.errors.full_messages.join(', ') }
        end
      rescue => e
        Rails.logger.error("Chapter import error for #{url}: #{e.message}")
        Rails.logger.error(e.backtrace.join("\n"))
        results << { url: url, status: 'error', message: e.message }
      end
    end
    
    render json: { results: results }
  end
  
  private
  
  def extract_chapter_number(url)
    # Try to extract chapter number from URL
    # Common patterns: chapter-X, chap-X, chuong-X, ch-X
    match = url.match(/(?:chapter|chap|chuong|ch)[_\-](\d+(?:\.\d+)?)/i)
    return match[1].to_f if match
    
    # Try another pattern: /X/ where X is a number
    match = url.match(/\/(\d+(?:\.\d+)?)\//)
    return match[1].to_f if match
    
    nil
  end
  
  def extract_chapter_title(url)
    # This is a simple implementation
    # For more accurate titles, we would need to parse the HTML
    uri = URI.parse(url)
    path = uri.path
    
    # Extract the last segment of the path
    segments = path.split('/')
    last_segment = segments.last
    
    # Clean up the segment
    if last_segment
      # Replace hyphens with spaces and capitalize
      title = last_segment.gsub('-', ' ').gsub('_', ' ')
      # Remove file extensions
      title = title.gsub(/\.(html|php|aspx)$/, '')
      # Remove chapter number patterns
      title = title.gsub(/chapter[\s\-_]\d+/i, '').gsub(/ch[\s\-_]\d+/i, '')
      # Capitalize each word
      title = title.split.map(&:capitalize).join(' ').strip
      
      return title unless title.empty?
    end
    
    nil
  end
  
  def extract_images_from_url(url)
    html = fetch_html(url)
    return [] unless html
    
    image_urls = []
    host = URI.parse(url).host
    
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
  
  def fetch_html(url)
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
  
  def extract_nettruyen_images(html, url)
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
    end
    
    image_urls
  end
  
  def extract_truyenvn_images(html, url)
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
  
  def extract_hentaivn_images(html, url)
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
  
  def extract_manhuavn_images(html, url)
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
  
  def extract_generic_images(html, base_url)
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