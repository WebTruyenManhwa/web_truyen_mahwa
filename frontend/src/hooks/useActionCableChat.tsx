import { useCallback, useEffect, useState, useRef } from 'react';
import { useActionCableContext } from '../contexts/ActionCableContext';

interface Message {
  id?: number;
  content: string;
  user_id: number;
  username: string;
  avatar?: string;
  created_at: string;
  sticker?: string;
  stickers?: string[];
}

interface UseActionCableChatOptions {
  onReceiveMessage?: (message: Message) => void;
}

interface ChatSubscription {
  unsubscribe: () => void;
  perform: (action: string, data?: Record<string, unknown>) => void;
}

export const useActionCableChat = (options?: UseActionCableChatOptions) => {
  const { consumer, isConnected } = useActionCableContext();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [lastMessage, setLastMessage] = useState<Message | null>(null);
  const subscriptionRef = useRef<ChatSubscription | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Hàm xử lý nhận tin nhắn
  const handleReceiveMessage = useCallback((message: Message) => {
    setLastMessage(message);
    options?.onReceiveMessage?.(message);
  }, [options]);

  useEffect(() => {
    // Chỉ tạo kết nối khi consumer sẵn sàng và đã kết nối
    if (!consumer || !isConnected) {
      setIsSubscribed(false);
      return;
    }

    // Nếu đã có subscription, không tạo mới
    if (subscriptionRef.current) {
      return;
    }

    console.log('Subscribing to chat channel');
    
    // Tạo subscription mới
    const subscription = consumer.subscriptions.create(
      { 
        channel: 'ChatChannel'
      },
      {
        connected() {
          console.log('Connected to chat channel');
          setIsSubscribed(true);
        },
        
        disconnected() {
          console.log('Disconnected from chat channel');
          setIsSubscribed(false);
        },
        
        received(data) {
          console.log('Received data from chat channel:', data);
          
          if (data.event === 'new_message' && data.data) {
            const message = data.data as Message;
            handleReceiveMessage(message);
          }
        }
      }
    );
    
    // Lưu subscription vào ref
    subscriptionRef.current = subscription;
    
    // Gửi ping định kỳ để giữ kết nối
    pingIntervalRef.current = setInterval(() => {
      if (subscription) {
        subscription.perform('ping', { timestamp: Date.now() });
      }
    }, 30000); // 30 giây
    
    // Cleanup khi component unmount
    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      
      if (subscriptionRef.current) {
        console.log('Unsubscribing from chat channel');
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [consumer, isConnected, handleReceiveMessage]);

  return {
    isConnected,
    isSubscribed,
    lastMessage
  };
};
