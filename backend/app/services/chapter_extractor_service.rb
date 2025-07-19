class ChapterExtractorService
  def self.extract_number(url)
    # Try to extract chapter number from URL
    # Common patterns: chapter-X, chap-X, chuong-X, ch-X
    match = url.match(/(?:chapter|chap|chuong|ch)[_\-](\d+(?:\.\d+)?)/i)
    return match[1].to_f if match

    # Try another pattern: /X/ where X is a number
    match = url.match(/\/(\d+(?:\.\d+)?)\//)
    return match[1].to_f if match

    nil
  end

  def self.extract_title(url)
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
end
