class Api::V1::AuthController < ActionController::API
  
  def google_token
    user = User.from_id_token(params[:id_token])
    if user
      token = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil).first
      render json: { token: token }
    else
      render json: { error: 'Invalid Google id_token' }, status: :unauthorized
    end
  end
end