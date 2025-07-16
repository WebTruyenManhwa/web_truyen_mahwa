class HealthController < ApplicationController
  skip_before_action :authenticate_user!, raise: false
  def check
    render json: { status: "ok" }, status: :ok
  end
end 