class ChatChannel < ApplicationCable::Channel
  def subscribed
    stream_from "chat_channel"
    logger.info "Client subscribed to chat_channel"
    
    # Gửi thông báo xác nhận đăng ký thành công
    transmit({ event: 'confirm_subscription', data: { channel: 'chat_channel' } })
  rescue => e
    logger.error "Error in subscribed: #{e.message}"
    logger.error e.backtrace.join("\n")
    reject
  end

  def unsubscribed
    logger.info "Client unsubscribed from chat_channel"
    stop_all_streams
  rescue => e
    logger.error "Error in unsubscribed: #{e.message}"
    logger.error e.backtrace.join("\n")
  end
  
  # Xử lý khi client gửi message
  def receive(data)
    logger.info "Received message from client: #{data.inspect}"
    
    # Xử lý ping từ client
    if data['action'] == 'ping' || data['ping']
      transmit({ event: 'pong', data: { timestamp: Time.now.to_i } })
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