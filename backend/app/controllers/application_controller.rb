class ApplicationController < ActionController::API
  include Pundit::Authorization
  
  before_action :configure_permitted_parameters, if: :devise_controller?
  
  rescue_from Pundit::NotAuthorizedError, with: :user_not_authorized
  rescue_from ActiveRecord::RecordNotFound, with: :not_found
  
  protected
  
  def configure_permitted_parameters
    devise_parameter_sanitizer.permit(:sign_up, keys: [:username])
    devise_parameter_sanitizer.permit(:account_update, keys: [:username])
  end
  
  def user_not_authorized
    render json: { error: 'Bạn không có quyền thực hiện hành động này' }, status: :forbidden
  end
  
  def not_found
    render json: { error: 'Không tìm thấy tài nguyên' }, status: :not_found
  end
end
