# frozen_string_literal: true

module Mutations
  class DeleteReadingHistory < BaseMutation
    description "Xóa một lịch sử đọc cụ thể"

    # Arguments
    argument :id, ID, required: true, description: "ID của lịch sử đọc cần xóa"

    # Fields
    field :success, Boolean, null: false, description: "Trạng thái xóa lịch sử đọc"
    field :errors, [String], null: false, description: "Danh sách lỗi nếu có"

    def resolve(id:)
      # Đảm bảo người dùng đã đăng nhập
      authenticate_user!

      # Tìm lịch sử đọc của người dùng hiện tại
      history = current_user.reading_histories.find_by(id: id)

      if history
        if history.destroy
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
      else
        {
          success: false,
          errors: ["Không tìm thấy lịch sử đọc"]
        }
      end
    end
  end
end
