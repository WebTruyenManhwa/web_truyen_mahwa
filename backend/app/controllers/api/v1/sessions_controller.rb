module Api
  module V1
    class SessionsController < Devise::SessionsController
      respond_to :json
      
      private
      
      def respond_with(resource, _opts = {})
        render json: {
          status: { code: 200, message: 'Đăng nhập thành công' },
          data: {
            user: {
              id: resource.id,
              email: resource.email,
              username: resource.username,
              role: resource.role
            }
          }
        }, status: :ok
      end
      
      def respond_to_on_destroy
        if current_user
          render json: {
            status: { code: 200, message: 'Đăng xuất thành công' }
          }, status: :ok
        else
          render json: {
            status: { code: 401, message: 'Không thể đăng xuất, vui lòng đăng nhập lại' }
          }, status: :unauthorized
        end
      end
    end
  end
end 