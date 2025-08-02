# frozen_string_literal: true

module Mutations
  class CreateComment < BaseMutation
    argument :commentable_id, ID, required: true
    argument :commentable_type, String, required: true
    argument :content, String, required: true
    
    field :comment, Types::CommentType, null: true
    field :errors, [String], null: false
    
    def resolve(commentable_id:, commentable_type:, content:)
      authenticate_user!
      
      commentable = commentable_type.constantize.find(commentable_id)
      comment = Comment.new(
        commentable: commentable,
        user: current_user,
        content: content
      )
      
      if comment.save
        { comment: comment, errors: [] }
      else
        { comment: nil, errors: comment.errors.full_messages }
      end
    end
  end
end
