class MonitorChannel < ApplicationCable::Channel
  def subscribed
    logger.info "Client subscribed to monitor channel"
    stream_from "monitor_channel"
  end

  def unsubscribed
    logger.info "Client unsubscribed from monitor channel"
    stop_all_streams
  end
end
