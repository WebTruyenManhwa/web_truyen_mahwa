import React, { useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import ChatModal from './ChatModal';

export default function ChatIcon() {
  const { theme } = useTheme();
  const [showChat, setShowChat] = useState(false);
  
  return (
    <>
      <div
        onClick={() => setShowChat(true)}
        className={`${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'} 
          text-center py-3 rounded-lg transition-all duration-200 hover:text-red-500 hover:scale-105 hover:shadow-md cursor-pointer
          relative group`}
      >
        <div className="flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        
        {/* Tooltip */}
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
          Chat
        </div>
      </div>
      
      {showChat && <ChatModal isOpen={showChat} onClose={() => setShowChat(false)} />}
    </>
  );
} 