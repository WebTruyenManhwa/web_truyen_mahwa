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
        unless current_user&.admin?
          render json: { error: 'Unauthorized access' }, status: :forbidden
        end
      end
    end
  end
end
