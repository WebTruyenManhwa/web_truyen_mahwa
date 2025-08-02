# frozen_string_literal: true

module Mutations
  class DeleteAllReadingHistories < BaseMutation
    description "Xóa tất cả lịch sử đọc của người dùng hiện tại"

    # Fields
    field :success, Boolean, null: false, description: "Trạng thái xóa lịch sử đọc"
    field :errors, [String], null: false, description: "Danh sách lỗi nếu có"

    def resolve
      # Đảm bảo người dùng đã đăng nhập
      authenticate_user!

      if current_user.reading_histories.destroy_all
        {
          success: true,
          errors: []
        }
      else
        {
          success: false,
          errors: ["Không thể xóa lịch sử đọc"]
        }
      end
    end
  end
end
