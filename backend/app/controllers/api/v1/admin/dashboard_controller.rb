module Api
  module V1
    module Admin
      class DashboardController < BaseController
        before_action :authenticate_user!
        before_action :authorize_admin

        def stats
          # Tính toán các thống kê
          total_mangas = Manga.count
          total_users = User.count
          total_views = Manga.sum(:view_count)

          # Thống kê hôm nay
          today = Date.today.beginning_of_day
          new_users_today = User.where('created_at >= ?', today).count
          new_mangas_today = Manga.where('created_at >= ?', today).count

          # Lượt xem hôm nay (ước tính từ lịch sử đọc)
          views_today = Chapter.where('updated_at >= ?', today).sum(:view_count)

          # Truyện mới cập nhật
          recent_mangas = Manga.includes(:chapters)
                              .order(updated_at: :desc)
                              .limit(5)
                              .map do |manga|
            {
              id: manga.id,
              title: manga.title,
              slug: manga.slug,
              chapters: manga.chapters.count,
              view_count: manga.view_count,
              status: manga.status,
              updatedAt: manga.updated_at
            }
          end

          # Người dùng mới đăng ký
          recent_users = User.order(created_at: :desc)
                            .limit(5)
                            .map do |user|
            {
              id: user.id,
              username: user.username,
              email: user.email,
              registeredAt: user.created_at,
              role: user.role
            }
          end

          render json: {
            dashboardStats: {
              totalMangas: total_mangas,
              totalUsers: total_users,
              totalViews: total_views,
              newUsersToday: new_users_today,
              newMangasToday: new_mangas_today,
              viewsToday: views_today
            },
            recentMangas: recent_mangas,
            recentUsers: recent_users
          }
        end

        private

        def authorize_admin
          unless current_user.admin?
            render json: { error: 'Unauthorized' }, status: :unauthorized
          end
        end
      end
    end
  end
end
