# module Api
#   module V1
#     class RatingsController < BaseController
#       before_action :authenticate_user!
#       before_action :set_manga
#       before_action :set_rating, only: [:update, :destroy]

#       def create
#         @rating = current_user.ratings.find_or_initialize_by(manga: @manga)
#         @rating.value = rating_params[:value]

#         if @rating.save
#           render json: {
#               rating: @manga.reload.rating,
#               totalVotes: @manga.total_votes
#           }
#         else
#           render json: { errors: @rating.errors }, status: :unprocessable_entity
#         end
#       end

#       def update
#         if @rating.update(rating_params)
#           render json: {
#               rating: @manga.reload.rating,
#               totalVotes: @manga.total_votes
#           }
#         else
#           render json: { errors: @rating.errors }, status: :unprocessable_entity
#         end
#       end

#       def destroy
#         @rating.destroy
#         render json: {
#             rating: @manga.reload.rating,
#             totalVotes: @manga.total_votes
#           }
#         else
#           render json: { errors: @rating.errors }, status: :unprocessable_entity
#         end
#       end

#       private

#       def set_manga
#         @manga = Manga.find(params[:manga_id])
#       end

#       def set_rating
#         @rating = current_user.ratings.find_by!(manga: @manga)
#       end

#       def rating_params
#         params.require(:rating).permit(:value)
#       end
#     end
#   end
# end 