"use client";

import { useEffect, useCallback } from 'react';
import { useActionCableContext } from '../contexts/ActionCableContext';
import { useCommentContext } from '../contexts/CommentContext';

interface UseActionCableCommentsOptions {
  chapterId: string | number;
}

interface Comment {
  id: number;
  content: string;
  sticker?: string;
  stickers?: string[];
  createdAt?: string;
  created_at?: string;
  has_replies?: boolean;
  replies?: Comment[];
  user?: {
    id: number;
    username: string;
    avatar?: string;
  };
  user_id?: number;
  parent_id?: number;
  commentable_type?: string;
  commentable_id?: number;
  updated_at?: string;
}

interface ActionCableMessage {
  event?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

export const useActionCableComments = ({ chapterId }: UseActionCableCommentsOptions) => {
  const { consumer, isConnected } = useActionCableContext();
  const { addComment, addReply } = useCommentContext();

  const subscribeToComments = useCallback(() => {
    if (!consumer || !isConnected) {
      console.log(`Cannot subscribe to comments: consumer=${!!consumer}, isConnected=${isConnected}`);
      return;
    }

    // Lấy ID thực của chapter từ URL hoặc data
    let realChapterId = chapterId;
    
    // Nếu chapterId là dạng slug (chapter-44-1), cần lấy ID thực từ page data
    if (typeof chapterId === 'string' && chapterId.startsWith('chapter-')) {
      // Thử lấy từ window object nếu có
      const chapterDataElement = document.getElementById('chapter-data');
      if (chapterDataElement && chapterDataElement.dataset.chapterId) {
        realChapterId = chapterDataElement.dataset.chapterId;
        console.log(`Found real chapter ID from DOM: ${realChapterId}`);
      }
      
      // Hoặc thử lấy từ URL
      const urlMatch = window.location.pathname.match(/\/manga\/(\d+)\/chapter\/(\d+)/);
      if (urlMatch && urlMatch[2]) {
        realChapterId = urlMatch[2];
        console.log(`Found real chapter ID from URL: ${realChapterId}`);
      }
    }
    
    const channelName = `chapter_${realChapterId}_comments`;
    console.log(`Subscribing to channel: ${channelName} (original chapterId: ${chapterId})`);
    
    // Đăng ký kênh comments
    const subscription = consumer.subscriptions.create(
      { 
        channel: 'CommentsChannel', 
        chapter_id: realChapterId
      },
      {
        connected() {
          console.log(`Connected to comments channel for chapter ${realChapterId}`);
        },
        
        disconnected() {
          console.log(`Disconnected from comments channel: ${channelName}`);
        },
        
        received(data: ActionCableMessage) {
          console.log('Received data from comments channel:', data);
          
          if (!data || typeof data !== 'object') {
            console.error('Invalid data format:', data);
            return;
          }
          
          // Xử lý theo loại sự kiện
          if (data.event === 'new_comment') {
            console.log('Received new_comment event with data:', data.data);
            const rawCommentData = data.data as unknown as Comment;
            
            // Chuyển đổi định dạng từ backend sang frontend
            const commentData: Comment = {
              ...rawCommentData,
              createdAt: rawCommentData.created_at || new Date().toISOString(),
            };
            
            console.log('Processed comment data:', commentData);
            
            if (commentData.parent_id) {
              console.log(`Adding reply to parent ${commentData.parent_id}:`, commentData);
              addReply(commentData.parent_id, commentData);
            } else {
              console.log('Adding new comment:', commentData);
              addComment(commentData);
            }
          } else if (data.event === 'confirm_subscription') {
            console.log('Subscription confirmed:', data.data);
          } else if (data.event === 'test_connection') {
            console.log('Test connection message:', data.data);
          } else {
            console.log(`Unhandled event type: ${data.event}`, data.data);
          }
        }
      }
    );
    
    // Gửi ping định kỳ để giữ kết nối
    const pingInterval = setInterval(() => {
      if (subscription) {
        console.log('Sending ping to server');
        subscription.perform('ping', { action: 'ping' });
      }
    }, 30000);
    
    return () => {
      console.log(`Unsubscribing from channel: ${channelName}`);
      subscription.unsubscribe();
      clearInterval(pingInterval);
    };
  }, [consumer, isConnected, chapterId, addComment, addReply]);

  useEffect(() => {
    console.log(`Setting up comments for chapter ${chapterId}, isConnected: ${isConnected}`);
    
    // Thử lại kết nối nếu chưa kết nối thành công
    let retryTimeout: NodeJS.Timeout | null = null;
    
    if (!isConnected) {
      console.log('ActionCable not connected, will retry in 2 seconds');
      retryTimeout = setTimeout(() => {
        console.log('Retrying ActionCable connection...');
        subscribeToComments();
      }, 2000);
    } else {
      const cleanup = subscribeToComments();
      
      return () => {
        if (cleanup) {
          console.log(`Cleaning up comments for chapter ${chapterId}`);
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