module Api
  module V1
    class UsersController < BaseController
      skip_before_action :authenticate_user!, only: [:show]
      before_action :set_user, only: [:show, :update, :favorites, :reading_history]

      def show
        render json: @user, except: [:password_digest, :created_at, :updated_at]
      end

      def show_current_user
        render json: current_user, except: [:password_digest, :created_at, :updated_at]
      end

      def update_current_user
        if current_user.update(user_params)
          render json: current_user, except: [:password_digest, :created_at, :updated_at]
        else
          render json: { errors: current_user.errors }, status: :unprocessable_entity
        end
      end

      def update
        if @user.id == current_user.id || current_user.admin? || current_user.super_admin?
          if @user.update(user_params)
            render json: @user, except: [:password_digest, :created_at, :updated_at]
          else
            render json: { errors: @user.errors }, status: :unprocessable_entity
          end
        else
          render json: { error: 'Bạn không có quyền cập nhật người dùng này' }, status: :forbidden
        end
      end

      def favorites
        @favorites = @user.favorites.includes(:manga)
        render json: @favorites, include: :manga
      end

      def check_favorite
        manga_id = params[:manga_id]

        # Find manga by ID or slug
        manga = if manga_id.to_i.to_s == manga_id.to_s
          # If manga_id is numeric, find by ID
          Manga.find_by(id: manga_id)
        else
          # Otherwise, find by slug
          Manga.find_by(slug: manga_id)
        end

        unless manga
          return render json: { error: "Manga not found" }, status: :not_found
        end

        is_favorite = current_user.favorites.exists?(manga_id: manga.id)
        render json: { is_favorite: is_favorite }
      end

      def toggle_favorite
        manga_id = params[:manga_id]

        # Find manga by ID or slug
        manga = if manga_id.to_i.to_s == manga_id.to_s
          # If manga_id is numeric, find by ID
          Manga.find_by(id: manga_id)
        else
          # Otherwise, find by slug
          Manga.find_by(slug: manga_id)
        end

        unless manga
          return render json: { error: "Manga not found" }, status: :not_found
        end

        favorite = current_user.favorites.find_by(manga_id: manga.id)

        if favorite
          favorite.destroy
          render json: { is_favorite: false, message: "Đã xóa khỏi danh sách yêu thích" }
        else
          favorite = current_user.favorites.create(manga_id: manga.id)
          render json: { is_favorite: true, message: "Đã thêm vào danh sách yêu thích" }
        end
      end

      def reading_history
        @reading_histories = @user.reading_histories.includes(chapter: :manga).order(updated_at: :desc)
        render json: @reading_histories, include: { chapter: { include: :manga } }
      end

      private

      def set_user
        @user = User.find(params[:id])
      end

      def user_params
        params.require(:user).permit(:username, :email, :password, :password_confirmation)
      end
    end
  end
end
