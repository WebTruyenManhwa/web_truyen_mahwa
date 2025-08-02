# frozen_string_literal: true

class WebTruyenMahwaSchema < GraphQL::Schema
  mutation(Types::WebTruyenMutationType)
  query(Types::WebTruyenQueryType)

  # Sử dụng GraphQL::Batch để giải quyết vấn đề N+1 queries
  use GraphQL::Batch

  # Cấu hình xử lý lỗi
  rescue_from(ActiveRecord::RecordNotFound) do |err, obj, args, ctx, field|
    raise GraphQL::ExecutionError, "#{field.type.unwrap.graphql_name} not found"
  end

  # Cấu hình giới hạn độ phức tạp của queries để tránh quá tải server
  max_complexity 300
  max_depth 15
end
