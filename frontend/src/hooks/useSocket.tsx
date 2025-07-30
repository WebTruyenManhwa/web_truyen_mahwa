"use client";

import { useEffect, useCallback } from 'react';
import { useSocketContext } from '../contexts/SocketContext';
import { useCommentContext } from '../contexts/CommentContext';

interface UseSocketOptions {
  chapterId: string | number;
}

interface Comment {
  id: number;
  content: string;
  sticker?: string;
  stickers?: string[];
  createdAt: string;
  has_replies?: boolean;
  replies?: Comment[];
  user?: {
    id: number;
    username: string;
    avatar?: string;
  };
  user_id?: number;
  parent_id?: number;
}

interface SocketMessage {
  event: string;
  data: Record<string, unknown>;
}

export const useCommentSocket = ({ chapterId }: UseSocketOptions) => {
  const { socket, isConnected } = useSocketContext();
  const { addComment, addReply } = useCommentContext();

  const subscribeToComments = useCallback(() => {
    if (!socket || !isConnected) {
      console.log(`Cannot subscribe to comments: socket=${!!socket}, isConnected=${isConnected}`);
      return;
    }

    const channel = `chapter_${chapterId}_comments`;
    
    console.log(`Subscribing to channel: ${channel}`);
    
    // Đăng ký nhận thông báo về comments mới
    socket.emit('subscribe', { channel });
    
    // Thử gửi một message test để kiểm tra kết nối
    setTimeout(() => {
      if (socket && isConnected) {
        console.log('Sending test message to server');
        socket.emit('message', { 
          action: 'test', 
          channel,
          data: { message: 'Test connection' } 
        });
      }
    }, 2000);

    // Xử lý tất cả các message từ server
    const handleMessage = (message: SocketMessage) => {
      console.log('Received socket message:', message);
      
      if (!message || typeof message !== 'object') {
        console.error('Invalid message format:', message);
        return;
      }
      
      const { event, data } = message;
      
      // Xử lý theo loại sự kiện
      switch (event) {
        case 'confirm_subscription':
          console.log('Subscription confirmed:', data);
          break;
          
        case 'new_comment':
          console.log('Received new comment:', data);
          const commentData = data as unknown as Comment;
          if (commentData.parent_id) {
            console.log(`Adding reply to parent ${commentData.parent_id}:`, commentData);
            addReply(commentData.parent_id, commentData);
          } else {
            console.log('Adding new comment:', commentData);
            addComment(commentData);
          }
          break;
          
        case 'pong':
          console.log('Received pong from server:', data);
          break;
          
        default:
          console.log(`Unhandled event type: ${event}`, data);
      }
    };
    
    // Lắng nghe sự kiện message
    socket.onAny((event, ...args) => {
      console.log(`Socket event received: ${event}`, args);
      if (args.length > 0) {
        handleMessage({ event, data: args[0] });
      }
    });

    // Gửi ping để kiểm tra kết nối
    const pingInterval = setInterval(() => {
      if (socket && isConnected) {
        console.log('Sending ping to server');
        socket.emit('ping', { action: 'ping', channel });
      }
    }, 30000); // 30 giây

    return () => {
      console.log(`Unsubscribing from channel: ${channel}`);
      socket.emit('unsubscribe', { channel });
      socket.offAny();
      clearInterval(pingInterval);
    };
  }, [socket, isConnected, chapterId, addComment, addReply]);

  useEffect(() => {
    console.log(`Setting up comment socket for chapter ${chapterId}, isConnected: ${isConnected}`);
    
    // Thử lại kết nối nếu chưa kết nối thành công
    let retryTimeout: NodeJS.Timeout | null = null;
    
    if (!isConnected) {
      console.log('Socket not connected, will retry in 2 seconds');
      retryTimeout = setTimeout(() => {
        console.log('Retrying socket connection...');
        subscribeToComments();
      }, 2000);
    } else {
      const cleanup = subscribeToComments();
      
      return () => {
        if (cleanup) {
          console.log(`Cleaning up comment socket for chapter ${chapterId}`);
          cleanup();
        }
      };
    }
    
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [subscribeToComments, chapterId, isConnected]);

  return { isConnected };
};
