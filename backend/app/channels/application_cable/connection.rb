module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :current_user

    def connect
      self.current_user = find_verified_user
      logger.add_tags 'ActionCable', current_user
      logger.info "Connected to ActionCable: #{current_user}"
    end

    def disconnect
      logger.info "Disconnected from ActionCable: #{current_user}"
    end

    private
      def find_verified_user
        # Thử tìm user từ cookie hoặc token
        if verified_user = find_user_from_token
          logger.info "Verified user: #{verified_user}"
          verified_user
        else
          # Cho phép kết nối ẩn danh với ID là IP
          anonymous_id = "anonymous_#{request.remote_ip}"
          logger.info "Anonymous connection from #{request.remote_ip}"
          anonymous_id
        end
      rescue StandardError => e
        logger.error "Error finding user: #{e.message}"
        logger.error e.backtrace.join("\n")
        "anonymous_error"
      end
      
      def find_user_from_token
        # Thử lấy token từ params
        token = request.params[:token]
        user_id = request.params[:user_id]
        
        logger.info "Finding user from token: token=#{token.present?}, user_id=#{user_id}"
        
        if user_id.present?
          # Tìm user từ ID
          begin
            User.find(user_id)
          rescue ActiveRecord::RecordNotFound => e
            logger.error "User not found: #{e.message}"
            nil
          end
        elsif token.present?
          # Có thể thêm logic xác thực token ở đây
          nil
        else
          nil
        end
      end
  end
end 