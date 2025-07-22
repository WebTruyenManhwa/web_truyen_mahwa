module Api
  module V1
    module Admin
      class AnalyticsController < BaseController
        before_action :authenticate_user!
        before_action :authorize_admin
        before_action :authorize_super_admin, only: [:advanced, :ai_prompt]

        # GET /api/v1/admin/analytics
        def index
          # Lấy thông số thời gian từ tham số
          time_range = params[:time_range] || 'week'

          # Tính toán khoảng thời gian
          case time_range
          when 'day'
            start_date = Date.today.beginning_of_day
          when 'week'
            start_date = 1.week.ago.beginning_of_day
          when 'month'
            start_date = 1.month.ago.beginning_of_day
          when 'year'
            start_date = 1.year.ago.beginning_of_day
          else
            start_date = 1.week.ago.beginning_of_day
          end

          # Sử dụng AnalyticsService để lấy dữ liệu
          views_data = AnalyticsService.get_views_over_time(start_date)
          genre_data = AnalyticsService.get_genre_distribution
          user_activity = AnalyticsService.get_user_activity_by_hour
          reading_habits = AnalyticsService.get_reading_habits
          ai_insights = AnalyticsService.get_ai_insights
          personalized_recommendations = AnalyticsService.get_personalized_recommendations

          render json: {
            views_over_time: views_data,
            genre_distribution: genre_data,
            user_activity: user_activity,
            reading_habits: reading_habits,
            ai_insights: ai_insights,
            personalized_recommendations: personalized_recommendations
          }
        end

        # GET /api/v1/admin/analytics/advanced
        def advanced
          # Lấy thông số thời gian từ tham số
          time_range = params[:time_range] || 'week'

          # Tính toán khoảng thời gian
          case time_range
          when 'day'
            start_date = Date.today.beginning_of_day
          when 'week'
            start_date = 1.week.ago.beginning_of_day
          when 'month'
            start_date = 1.month.ago.beginning_of_day
          when 'year'
            start_date = 1.year.ago.beginning_of_day
          else
            start_date = 1.week.ago.beginning_of_day
          end

          # Sử dụng AdvancedAnalyticsService để lấy dữ liệu nâng cao
          genre_trends = AdvancedAnalyticsService.get_genre_trends_over_time(start_date)
          dropoff_rate = AdvancedAnalyticsService.get_reading_dropoff_rate
          user_segments = AdvancedAnalyticsService.get_user_segments
          traffic_sources = AdvancedAnalyticsService.get_traffic_sources
          kpis = AdvancedAnalyticsService.get_key_performance_indicators
          geo_data = AdvancedAnalyticsService.get_geographic_data

          render json: {
            genre_trends: genre_trends,
            dropoff_rate: dropoff_rate,
            user_segments: user_segments,
            traffic_sources: traffic_sources,
            kpis: kpis,
            geo_data: geo_data
          }
        end

        # POST /api/v1/admin/analytics/ai_prompt
        def ai_prompt
          data_type = params[:data_type] || 'general'
          user_prompt = params[:user_prompt]

          # Sử dụng AiAnalyticsService để phân tích dữ liệu
          result = AiAnalyticsService.analyze_data(data_type, user_prompt)

          if result[:success]
            render json: {
              prompt: result[:prompt],
              response: result[:response]
            }
          else
            # Trả về status 503 nếu có lỗi Service Unavailable
            status_code = result[:error] == "Service Unavailable" ? :service_unavailable : :ok

            render json: {
              prompt: result[:prompt],
              response: result[:response],
              error: result[:error]
            }, status: status_code
          end
        end

        private

        def authorize_admin
          unless current_user.admin? || current_user.super_admin?
            render json: { error: 'Unauthorized' }, status: :unauthorized
          end
        end

        def authorize_super_admin
          unless current_user.super_admin?
            render json: { error: 'Unauthorized. Only super admins can access this feature.' }, status: :unauthorized
          end
        end
      end
    end
  end
end
