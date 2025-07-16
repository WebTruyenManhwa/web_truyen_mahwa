class ChapterListSerializer < ActiveModel::Serializer
  attributes :id, :title, :number, :view_count, :created_at, :updated_at, :slug, :manga, :images, :next_chapter, :prev_chapter

  def manga
    {
      id: object[:manga][:id],
      title: object[:manga][:title],
      slug: object[:manga][:slug]
    }
  end

  def images
    object[:images]
  end

  def next_chapter
    object[:next_chapter]
  end

  def prev_chapter
    object[:prev_chapter]
  end
end
