module Api
  module V1
    class RegistrationsController < Devise::RegistrationsController
      respond_to :json
      
      private
      
      def respond_with(resource, _opts = {})
        if resource.persisted?
          render json: {
            status: { code: 200, message: 'Đăng ký thành công' },
            data: {
              user: {
                id: resource.id,
                email: resource.email,
                username: resource.username,
                role: resource.role
              }
            }
          }, status: :ok
        else
          render json: {
            status: { code: 422, message: 'Đăng ký thất bại', errors: resource.errors.full_messages }
          }, status: :unprocessable_entity
        end
      end
      
      def sign_up_params
        params.require(:user).permit(:email, :username, :password, :password_confirmation)
      end
      
      def account_update_params
        params.require(:user).permit(:email, :username, :password, :password_confirmation, :current_password)
      end
    end
  end
end 