module Api
  module V1
    class BaseController < ApplicationController
      include Pagy::Backend

      before_action :authenticate_user!

      private

      def pagination_dict(pagy)
        {
          current_page: pagy.page,
          next_page: pagy.next,
          prev_page: pagy.prev,
          total_pages: pagy.pages,
          total_count: pagy.count
        }
      end

      def authorize_admin
        unless current_user&.admin? || current_user&.super_admin?
          render json: { error: 'Unauthorized access' }, status: :forbidden
        end
      end

      # Phương thức để xác thực admin và trả về lỗi nếu không phải admin
      def authenticate_admin!
        authenticate_user!
        unless current_user&.admin? || current_user&.super_admin?
          render json: { error: 'Unauthorized access. Admin privileges required.' }, status: :forbidden
        end
      end

      # Cache current_user to avoid repeated database lookups
      def current_user
        # Use request store to cache the user for the duration of the request
        @current_user ||= begin
          # Use warden to get the user - this is compatible with Devise's authentication
          warden.authenticate(scope: :user)
        end
      end

      # Cache JWT validation to avoid repeated database lookups
      def jwt_denylist_exists?(jti)
        # Use request store to cache the result for the duration of the request
        @jwt_denylist_cache ||= {}

        return @jwt_denylist_cache[jti] if @jwt_denylist_cache.key?(jti)

        result = JwtDenylist.exists?(jti: jti)
        @jwt_denylist_cache[jti] = result
        result
      end
    end
  end
end
