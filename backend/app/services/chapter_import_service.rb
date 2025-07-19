class ChapterImportService
  def self.batch_import(manga, urls, options = {})
    auto_number = options.fetch(:auto_number, true)
    start_number = options.fetch(:start_number, 1).to_f

    results = []

    urls.each_with_index do |url, index|
      begin
        # Extract chapter number from URL if possible
        chapter_number = ChapterExtractorService.extract_number(url)

        # If auto_number is true or no chapter number was extracted, use the index-based number
        if auto_number || chapter_number.nil?
          chapter_number = start_number + index
        end

        # Extract chapter title if possible
        chapter_title = ChapterExtractorService.extract_title(url)

        # Create a default title if none was extracted
        chapter_title ||= "Chapter #{chapter_number}"

        # Extract images from the URL
        image_urls = ImageExtractorService.extract_from_url(url)

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
            # Sử dụng add_image thay vì chapter_images.create
            chapter.add_image({
              external_url: image_url,
              position: position,
              is_external: true
            })
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

    results
  end
end
