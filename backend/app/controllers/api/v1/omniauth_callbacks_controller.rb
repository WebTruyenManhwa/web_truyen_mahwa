module Api
  module V1
    class OmniauthCallbacksController < Devise::OmniauthCallbacksController
      # Xử lý callback từ Google
      def google_oauth2
        @user = User.from_omniauth(request.env["omniauth.auth"])

        if @user && @user.persisted?
          # Đăng nhập thành công
          sign_in @user
          token = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil).first

          # Chuyển hướng về frontend với token
          redirect_to "#{ENV.fetch('FRONTEND_URL', 'http://localhost:3000')}/auth/callback?token=#{token}", allow_other_host: true
        else
          # Đăng nhập thất bại
          error_message = "Đăng nhập bằng Google thất bại"
          Rails.logger.error("Google OAuth failed: User not persisted or nil")
          redirect_to "#{ENV.fetch('FRONTEND_URL', 'http://localhost:3000')}/auth/login?error=#{CGI.escape(error_message)}", allow_other_host: true
        end
      rescue => e
        Rails.logger.error("Google OAuth exception: #{e.message}")
        redirect_to "#{ENV.fetch('FRONTEND_URL', 'http://localhost:3000')}/auth/login?error=#{CGI.escape('Đã xảy ra lỗi khi đăng nhập với Google')}", allow_other_host: true
      end

      # Xử lý lỗi
      def failure
        error_message = params[:message] || 'Đăng nhập thất bại'
        Rails.logger.error("OAuth failure: #{error_message}")
        redirect_to "#{ENV.fetch('FRONTEND_URL', 'http://localhost:3000')}/auth/login?error=#{CGI.escape(error_message)}", allow_other_host: true
      end
    end
  end
end 