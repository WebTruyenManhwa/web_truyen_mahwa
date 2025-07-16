class NovelChapter < ApplicationRecord
  belongs_to :novel_series

  validates :title, presence: true
  validates :content, presence: true
  validates :chapter_number, presence: true, numericality: { only_integer: true, greater_than: 0 }
  validates :slug, presence: true, uniqueness: { scope: :novel_series_id }

  before_validation :generate_slug, if: -> { slug.blank? && title.present? }
  before_validation :set_chapter_number, if: -> { chapter_number.nil? }
  before_save :render_markdown_to_html

  default_scope { order(chapter_number: :asc) }

  # Batch chapter methods
  def batch_chapter?
    is_batch_chapter == true
  end

  def batch_range
    return nil unless batch_chapter?
    (batch_start..batch_end)
  end

  private

  def render_markdown_to_html
    return unless content_changed? || rendered_html.blank?

    begin
      renderer = Redcarpet::Render::HTML.new(
        hard_wrap: true,
        filter_html: false,
        no_images: false,
        no_links: false,
        no_styles: false,
        safe_links_only: true
      )

      markdown = Redcarpet::Markdown.new(renderer,
        autolink: true,
        tables: true,
        fenced_code_blocks: true,
        strikethrough: true,
        superscript: true,
        underline: true,
        highlight: true,
        quote: true,
        footnotes: true
      )

      self.rendered_html = markdown.render(content.to_s)
    rescue => e
      Rails.logger.error("Markdown rendering error: #{e.message}")
      # Fallback to plain text if rendering fails
      self.rendered_html = content.to_s
    end
  end

  def generate_slug
    base_slug = title.parameterize
    self.slug = base_slug

    # Ensure slug uniqueness within the novel series
    counter = 1
    while NovelChapter.where(novel_series_id: novel_series_id, slug: self.slug).exists?
      self.slug = "#{base_slug}-#{counter}"
      counter += 1
    end
  end

  def set_chapter_number
    last_chapter = novel_series.novel_chapters.order(chapter_number: :desc).first
    self.chapter_number = last_chapter ? last_chapter.chapter_number + 1 : 1
  end
end
