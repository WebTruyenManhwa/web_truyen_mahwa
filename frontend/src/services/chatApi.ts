import { apiClient } from './apiClient';

interface Message {
  id?: number;
  content: string;
  user_id: number;
  username: string;
  avatar?: string;
  created_at: string;
  sticker?: string;
}

interface SendMessagePayload {
  content?: string;
  sticker?: string;
}

export const chatApi = {
  /**
   * Lấy danh sách tin nhắn chat
   * @param page Trang hiện tại
   * @param perPage Số tin nhắn mỗi trang
   * @returns Danh sách tin nhắn
   */
  getMessages: async (page: number = 1, perPage: number = 50): Promise<Message[]> => {
    try {
      const response = await apiClient.get(`/v1/chat/messages?page=${page}&per_page=${perPage}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      throw error;
    }
  },

  /**
   * Gửi tin nhắn chat
   * @param message Nội dung tin nhắn
   * @returns Tin nhắn đã gửi
   */
  sendMessage: async (message: SendMessagePayload): Promise<Message> => {
    try {
      const response = await apiClient.post('/v1/chat/messages', { message });
      return response.data;
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw error;
    }
  }
}; 