class ChapterImageCollectionSerializer < ActiveModel::Serializer
  attributes :id, :chapter_id, :images
  
  def images
    object.images.sort_by { |img| img['position'] }
  end
end 