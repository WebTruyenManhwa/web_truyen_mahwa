import { useCallback, useEffect, useState } from 'react';
import { useActionCableContext } from '../contexts/ActionCableContext';

interface Message {
  id?: number;
  content: string;
  user_id: number;
  username: string;
  avatar?: string;
  created_at: string;
  sticker?: string;
}

interface UseActionCableChatOptions {
  onReceiveMessage?: (message: Message) => void;
}

export const useActionCableChat = (options?: UseActionCableChatOptions) => {
  const { consumer, isConnected } = useActionCableContext();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [lastMessage, setLastMessage] = useState<Message | null>(null);

  const subscribeToChat = useCallback(() => {
    if (!consumer || !isConnected) {
      console.log('Cannot subscribe to chat: consumer not ready or not connected');
      return null;
    }

    console.log('Subscribing to chat channel');
    
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
            setLastMessage(message);
            
            if (options?.onReceiveMessage) {
              options.onReceiveMessage(message);
            }
          }
        }
      }
    );
    
    // Gửi ping định kỳ để giữ kết nối
    const pingInterval = setInterval(() => {
      if (subscription) {
        subscription.perform('ping', { timestamp: Date.now() });
      }
    }, 30000); // 30 giây
    
    return { subscription, pingInterval };
  }, [consumer, isConnected, options]);

  useEffect(() => {
    if (!consumer || !isConnected) return;
    
    const { subscription, pingInterval } = subscribeToChat() || {};
    
    return () => {
      if (subscription) {
        console.log('Unsubscribing from chat channel');
        subscription.unsubscribe();
      }
      
      if (pingInterval) {
        clearInterval(pingInterval);
      }
    };
  }, [consumer, isConnected, subscribeToChat]);

  return {
    isConnected,
    isSubscribed,
    lastMessage
  };
}; 