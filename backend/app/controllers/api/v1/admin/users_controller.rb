module Api
  module V1
    module Admin
      class UsersController < BaseController
        before_action :authenticate_user!
        before_action :authorize_admin
        before_action :set_user, only: [:update_role, :destroy]
        before_action :check_super_admin_for_critical_actions, only: [:destroy]

        def index
          @pagy, @users = pagy(User.all.order(created_at: :desc))

          render json: {
            users: @users.map { |user|
              {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                created_at: user.created_at,
                can_be_deleted: can_delete_user?(user),
                can_change_role: can_change_role?(user)
              }
            },
            pagination: pagination_dict(@pagy)
          }
        end

        def update_role
          # Kiểm tra quyền super_admin nếu đang cố gắng thay đổi vai trò thành super_admin
          if params[:role] == 'super_admin' && !current_user.super_admin?
            return render json: { error: "Bạn không có quyền cấp vai trò Super Admin" }, status: :forbidden
          end

          # Không cho phép hạ cấp super_admin trừ khi người thực hiện cũng là super_admin
          if @user.super_admin? && !current_user.super_admin?
            return render json: { error: "Bạn không có quyền thay đổi vai trò của Super Admin" }, status: :forbidden
          end

          # Không cho phép tự thay đổi vai trò của chính mình
          if @user.id == current_user.id
            return render json: { error: "Bạn không thể thay đổi vai trò của chính mình" }, status: :forbidden
          end

          if @user.update(role: params[:role])
            render json: {
              message: "Đã cập nhật vai trò thành công",
              user: {
                id: @user.id,
                username: @user.username,
                email: @user.email,
                role: @user.role,
                can_be_deleted: can_delete_user?(@user),
                can_change_role: can_change_role?(@user)
              }
            }
          else
            render json: { errors: @user.errors }, status: :unprocessable_entity
          end
        end

        # DELETE /api/v1/admin/users/:id
        def destroy
          # Không cho phép xóa super_admin
          if @user.super_admin?
            return render json: { error: "Không thể xóa tài khoản Super Admin" }, status: :forbidden
          end

          # Không cho phép tự xóa chính mình
          if @user.id == current_user.id
            return render json: { error: "Bạn không thể xóa tài khoản của chính mình" }, status: :forbidden
          end

          # Nếu là admin thường thì chỉ được xóa user thường
          if current_user.admin? && !current_user.super_admin? && @user.admin?
            return render json: { error: "Admin thường không thể xóa tài khoản Admin khác" }, status: :forbidden
          end

          # Thực hiện xóa user
          if @user.destroy
            render json: { message: "Đã xóa người dùng thành công" }
          else
            render json: { error: "Không thể xóa người dùng" }, status: :unprocessable_entity
          end
        end

        private

        def set_user
          @user = User.find(params[:id])
        end

        # Kiểm tra quyền super_admin cho các hành động quan trọng
        def check_super_admin_for_critical_actions
          unless can_delete_user?(@user)
            render json: { error: "Bạn không có quyền thực hiện hành động này" }, status: :forbidden
          end
        end

        # Kiểm tra xem có thể xóa user hay không
        def can_delete_user?(user)
          return false if user.super_admin? # Super admin không thể bị xóa
          return false if user.id == current_user.id # Không thể tự xóa mình

          # Admin thường không thể xóa admin khác
          if current_user.admin? && !current_user.super_admin? && user.admin?
            return false
          end

          # Super admin có thể xóa tất cả (trừ super admin khác)
          # Admin thường chỉ có thể xóa user thường
          true
        end

        # Kiểm tra xem có thể thay đổi vai trò của user hay không
        def can_change_role?(user)
          return false if user.id == current_user.id # Không thể thay đổi vai trò của chính mình

          # Admin thường không thể thay đổi vai trò của admin khác hoặc super admin
          if current_user.admin? && !current_user.super_admin? && (user.admin? || user.super_admin?)
            return false
          end

          # Super admin có thể thay đổi vai trò của tất cả (trừ super admin khác)
          # Admin thường chỉ có thể thay đổi vai trò của user thường
          true
        end
      end
    end
  end
end
