class NovelChapter < ApplicationRecord
  belongs_to :novel_series

  validates :title, presence: true
  validates :content, presence: true
  validates :chapter_number, presence: true, numericality: { only_integer: true, greater_than: 0 }
  validates :slug, presence: true, uniqueness: { scope: :novel_series_id }

  before_validation :generate_slug, if: -> { slug.blank? && title.present? }
  before_validation :set_chapter_number, if: -> { chapter_number.nil? }

  default_scope { order(chapter_number: :asc) }

  private

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
