import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useActionCableChat } from '../../hooks/useActionCableChat';
import { chatApi } from '../../services/chatApi';
import Image from 'next/image';

interface Message {
  id?: number;
  content: string;
  user_id: number;
  username: string;
  avatar?: string;
  created_at: string;
  sticker?: string;
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatModal({ isOpen, onClose }: ChatModalProps) {
  const { theme } = useTheme();
  const { isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [showStickers, setShowStickers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const stickersRef = useRef<HTMLDivElement>(null);

  // Kết nối với ActionCable
  const { isSubscribed } = useActionCableChat({
    onReceiveMessage: (message) => {
      setMessages(prev => [...prev, message]);
    }
  });

  // Stickers collection
  const stickers = [
    'https://cdn-icons-png.flaticon.com/128/742/742760.png',
    'https://cdn-icons-png.flaticon.com/128/742/742751.png',
    'https://cdn-icons-png.flaticon.com/128/742/742784.png',
    'https://cdn-icons-png.flaticon.com/128/742/742750.png',
    'https://cdn-icons-png.flaticon.com/128/742/742745.png',
    'https://cdn-icons-png.flaticon.com/128/742/742821.png',
    'https://cdn-icons-png.flaticon.com/128/742/742752.png',
    'https://cdn-icons-png.flaticon.com/128/742/742920.png'
  ];

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Load initial messages
  useEffect(() => {
    if (isOpen) {
      fetchMessages();
    }
  }, [isOpen]);

  // Đóng sticker panel khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (stickersRef.current && !stickersRef.current.contains(event.target as Node)) {
        setShowStickers(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const data = await chatApi.getMessages();
      setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((!inputMessage.trim() && !selectedSticker) || !isAuthenticated) return;
    
    try {
      await chatApi.sendMessage({
        content: inputMessage.trim(),
        sticker: selectedSticker || undefined
      });
      
      setInputMessage('');
      setSelectedSticker(null);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render user avatar or default
  const renderAvatar = (message: Message) => {
    if (message.avatar) {
      return (
        <Image
          src={message.avatar}
          alt={message.username}
          width={32}
          height={32}
          className="rounded-full w-8 h-8 object-cover"
        />
      );
    }
    
    // Generate color based on username
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500', 'bg-pink-500'];
    const colorIndex = message.username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    const bgColor = colors[colorIndex];
    
    return (
      <div className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center`}>
        <span className="text-white font-medium">{message.username.charAt(0).toUpperCase()}</span>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div 
        className={`w-full max-w-lg max-h-[80vh] rounded-lg shadow-lg overflow-hidden ${
          theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
        }`}
      >
        {/* Header */}
        <div className={`px-4 py-3 flex justify-between items-center border-b ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h3 className="font-bold text-lg">Phòng Chat</h3>
          <div className="flex items-center">
            {isSubscribed ? (
              <span className="mr-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">Online</span>
            ) : (
              <span className="mr-2 text-xs bg-gray-500 text-white px-2 py-0.5 rounded-full">Offline</span>
            )}
            <button
              onClick={onClose}
              className="rounded-full p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Messages */}
        <div 
          ref={chatContainerRef}
          className={`p-4 overflow-y-auto h-96 ${
            theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
          }`}
        >
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <p className={`text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!
              </p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={message.id || index} className="mb-4 flex items-start">
                <div className="mr-2 flex-shrink-0">
                  {renderAvatar(message)}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline">
                    <span className="font-medium text-sm mr-2">{message.username}</span>
                    <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatTime(message.created_at)}
                    </span>
                  </div>
                  <div className={`mt-1 p-2 rounded-lg ${
                    theme === 'dark' ? 'bg-gray-800' : 'bg-white border border-gray-200'
                  }`}>
                    {message.sticker && (
                      <img src={message.sticker} alt="Sticker" className="h-12 w-12 mb-1" />
                    )}
                    {message.content && <p className="text-sm break-words">{message.content}</p>}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input area */}
        <form onSubmit={sendMessage} className={`p-3 border-t ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center">
            <div className="relative mr-2" ref={stickersRef}>
              <button
                type="button"
                onClick={() => setShowStickers(!showStickers)}
                className={`p-2 rounded-full ${
                  theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.536 5.879a1 1 0 001.414 0 3 3 0 014.242 0 1 1 0 001.414-1.414 5 5 0 00-7.07 0 1 1 0 000 1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {showStickers && (
                <div className={`absolute bottom-full left-0 mb-2 p-2 rounded-lg grid grid-cols-4 gap-2 z-10 w-60 ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-white border border-gray-200'
                } shadow-lg`}>
                  {stickers.map((sticker, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setSelectedSticker(sticker);
                        setShowStickers(false);
                      }}
                      className={`p-1 rounded hover:bg-opacity-20 ${
                        theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                      }`}
                    >
                      <img src={sticker} alt={`Sticker ${index + 1}`} className="h-8 w-8" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className={`flex-1 flex items-center py-1 px-3 rounded-full ${
              theme === 'dark' 
                ? 'bg-gray-700 text-white' 
                : 'bg-gray-100 text-gray-900'
            }`}>
              {selectedSticker && (
                <div className="flex items-center mr-2">
                  <img src={selectedSticker} alt="Selected sticker" className="h-6 w-6" />
                  <button
                    type="button"
                    onClick={() => setSelectedSticker(null)}
                    className="ml-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={isAuthenticated ? "Nhập tin nhắn..." : "Đăng nhập để chat"}
                disabled={!isAuthenticated}
                className="flex-1 bg-transparent focus:outline-none focus:ring-0"
              />
            </div>
            
            <button
              type="submit"
              disabled={(!inputMessage.trim() && !selectedSticker) || !isAuthenticated}
              className={`ml-2 p-2 rounded-full ${
                (!inputMessage.trim() && !selectedSticker) || !isAuthenticated
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}