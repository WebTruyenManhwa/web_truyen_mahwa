class CommentSerializer < ActiveModel::Serializer
  attributes :id, :user_id, :content, :sticker, :stickers, :created_at, :updated_at, :has_replies

  attribute :createdAt do
    object.created_at
  end

  attribute :updatedAt do
    object.updated_at
  end

  attribute :has_replies do
    object.replies.loaded? ? object.replies.any? : object.replies.exists?
  end

  belongs_to :user

  has_many :replies, serializer: CommentSerializer
end
