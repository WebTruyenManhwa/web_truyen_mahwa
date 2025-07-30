class CommentsChannel < ApplicationCable::Channel
  def subscribed
    # Xác định kênh từ tham số
    channel_name = if params[:chapter_id].present?
      "chapter_#{params[:chapter_id]}_comments"
    elsif params[:channel].present?
      params[:channel]
    else
      nil
    end

    if channel_name.present?
      logger.info "Subscribing to channel: #{channel_name}"
      stream_from channel_name
      logger.info "Client subscribed to channel: #{channel_name}"
      
      # Gửi thông báo xác nhận đăng ký thành công
      transmit({ event: 'confirm_subscription', data: { channel: channel_name } })
      
      # Gửi thông báo test để kiểm tra kết nối
      ActionCable.server.broadcast(
        channel_name, 
        {
          event: 'test_connection',
          data: { message: 'Connection established', timestamp: Time.now.to_i }
        }
      )
    else
      logger.error "Client attempted to subscribe without specifying a channel or chapter_id"
      reject
    end
  rescue => e
    logger.error "Error in subscribed: #{e.message}"
    logger.error e.backtrace.join("\n")
    reject
  end

  def unsubscribed
    # Hủy đăng ký khỏi kênh khi client ngắt kết nối
    channel_name = if params[:chapter_id].present?
      "chapter_#{params[:chapter_id]}_comments"
    else
      params[:channel]
    end
    
    logger.info "Client unsubscribed from channel: #{channel_name}"
    stop_all_streams
  rescue => e
    logger.error "Error in unsubscribed: #{e.message}"
    logger.error e.backtrace.join("\n")
  end
  
  # Xử lý khi client gửi message
  def receive(data)
    logger.info "Received message from client: #{data.inspect}"
    
    channel_name = if params[:chapter_id].present?
      "chapter_#{params[:chapter_id]}_comments"
    else
      params[:channel]
    end
    
    # Xử lý ping từ client
    if data['action'] == 'ping' || data['ping']
      transmit({ event: 'pong', data: { timestamp: Time.now.to_i } })
    end
    
    # Xử lý test từ client
    if data['action'] == 'test'
      logger.info "Received test message, echoing back"
      transmit({ event: 'test_response', data: { 
        message: 'Test received', 
        original: data['data'],
        timestamp: Time.now.to_i 
      }})
      
      # Broadcast lại cho tất cả client
      ActionCable.server.broadcast(
        channel_name, 
        {
          event: 'test_broadcast',
          data: { 
            message: 'Test broadcast', 
            from: connection.current_user,
            timestamp: Time.now.to_i 
          }
        }
      )
    end
  rescue => e
    logger.error "Error in receive: #{e.message}"
    logger.error e.backtrace.join("\n")
  end
  
  # Xử lý ping từ client
  def ping(data)
    logger.info "Received ping from client: #{data.inspect}"
    transmit({ event: 'pong', data: { timestamp: Time.now.to_i } })
  rescue => e
    logger.error "Error in ping: #{e.message}"
    logger.error e.backtrace.join("\n")
  end
end 