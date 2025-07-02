class ReadingHistorySerializer < ActiveModel::Serializer
  attributes :id, :last_read_at
  
  belongs_to :manga
  belongs_to :chapter
end 