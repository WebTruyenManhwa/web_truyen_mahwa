class ChapterSerializer < ActiveModel::Serializer
  attributes :id, :title, :number, :view_count, :created_at, :updated_at, :next_chapter, :prev_chapter, :manga
  has_many :chapter_images

  def next_chapter
    next_chap = object.manga.chapters.where("number > ?", object.number).order(number: :asc).first
    next_chap ? { id: next_chap.id, number: next_chap.number } : nil
  end

  def prev_chapter
    prev_chap = object.manga.chapters.where("number < ?", object.number).order(number: :desc).first
    prev_chap ? { id: prev_chap.id, number: prev_chap.number } : nil
  end

  def manga
    {
      id: object.manga.id,
      title: object.manga.title
    }
  end
end 