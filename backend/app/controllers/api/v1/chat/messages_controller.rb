module Api
  module V1
    module Chat
      class MessagesController < BaseController
        skip_before_action :authenticate_user!, only: [:index]
        before_action :set_pagination_params, only: [:index]
        
        # GET /api/v1/chat/messages
        def index
          # Lấy tin nhắn mới nhất, giới hạn số lượng để tránh quá tải
          @messages = ChatMessage.includes(:user)
                                .order(created_at: :desc)
                                .limit(@per_page)
                                .offset(@offset)
          
          # Đảo ngược lại để hiển thị theo thứ tự thời gian tăng dần
          @messages = @messages.reverse
          
          render json: @messages.as_json(include: {
            user: { only: [:id, :username, :avatar] }
          })
        end
        
        # POST /api/v1/chat/messages
        def create
          @message = ChatMessage.new(message_params)
          @message.user = current_user
          
          if @message.save
            # Broadcast message qua ActionCable
            ActionCable.server.broadcast(
              "chat_channel", 
              {
                event: 'new_message',
                data: @message.as_json(include: {
                  user: { only: [:id, :username, :avatar] }
                })
              }
            )
            
            render json: @message, status: :created
          else
            render json: { errors: @message.errors.full_messages }, status: :unprocessable_entity
          end
        end
        
        private
        
        def message_params
          params.require(:message).permit(:content, :sticker)
        end
        
        def set_pagination_params
          @page = params[:page].to_i || 1
          @page = 1 if @page < 1
          
          @per_page = params[:per_page].to_i || 50
          @per_page = 50 if @per_page > 100 || @per_page < 1
          
          @offset = (@page - 1) * @per_page
        end
      end
    end
  end
end 