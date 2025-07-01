class HomeController < ApplicationController
  def index
    render html: '', layout: false
  end

  def auth_test
    render json: {
      message: "Auth test route is working",
      omniauth_path: user_google_oauth2_omniauth_authorize_path,
      env: {
        api_url: ENV['FRONTEND_URL'],
        google_client_id: ENV['GOOGLE_CLIENT_ID'] ? "Configured" : "Missing",
        google_client_secret: ENV['GOOGLE_CLIENT_SECRET'] ? "Configured" : "Missing"
      }
    }
  end
end 