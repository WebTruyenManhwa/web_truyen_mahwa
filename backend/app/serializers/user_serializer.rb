class UserSerializer < ActiveModel::Serializer
  attributes :id, :username, :email, :role, :created_at
  
  attribute :avatar do
    nil # Return nil since avatar is not implemented yet
  end
end 