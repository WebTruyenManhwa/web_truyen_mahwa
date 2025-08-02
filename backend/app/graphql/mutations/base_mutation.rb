# frozen_string_literal: true

module Mutations
  class BaseMutation < GraphQL::Schema::RelayClassicMutation
    argument_class Types::BaseArgument
    field_class Types::BaseField
    input_object_class Types::BaseInputObject
    object_class Types::BaseObject

    # Các phương thức chung cho tất cả các mutation
    def current_user
      context[:current_user]
    end

    def authenticate_user!
      unless current_user
        raise GraphQL::ExecutionError, "Bạn phải đăng nhập để thực hiện thao tác này"
      end
    end
  end
end
