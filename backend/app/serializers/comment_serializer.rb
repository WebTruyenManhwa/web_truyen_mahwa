class CommentSerializer < ActiveModel::Serializer
  attributes :id, :content, :created_at, :updated_at
  
  attribute :createdAt do
    object.created_at
  end
  
  attribute :updatedAt do
    object.updated_at
  end
  
  belongs_to :user
end 