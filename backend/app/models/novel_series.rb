class NovelSeries < ApplicationRecord
  has_many :novel_chapters, dependent: :destroy

  validates :title, presence: true
  validates :slug, presence: true, uniqueness: true

  before_validation :generate_slug, if: -> { slug.blank? && title.present? }

  enum :status, { ongoing: 'ongoing', completed: 'completed', hiatus: 'hiatus' }

  # Set default status to ongoing
  after_initialize :set_default_status, if: :new_record?

  def chapters_count
    novel_chapters.count
  end

  private

  def set_default_status
    self.status ||= :ongoing
  end

  def generate_slug
    base_slug = title.parameterize
    self.slug = base_slug

    # Ensure slug uniqueness
    counter = 1
    while NovelSeries.where(slug: self.slug).exists?
      self.slug = "#{base_slug}-#{counter}"
      counter += 1
    end
  end
end
