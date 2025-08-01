import React, { useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import ChatModal from './ChatModal';

export default function ChatButton() {
  const { theme } = useTheme();
  const [showChat, setShowChat] = useState(false);
  
  return (
    <>
      <button
        onClick={() => setShowChat(true)}
        className={`fixed bottom-6 right-6 z-30 p-4 rounded-full shadow-lg flex items-center justify-center ${
          theme === 'dark' ? 'bg-red-600 hover:bg-red-700' : 'bg-red-600 hover:bg-red-700'
        } text-white transition-all duration-300 hover:scale-110`}
        aria-label="Chat"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>
      
      {showChat && <ChatModal isOpen={showChat} onClose={() => setShowChat(false)} />}
    </>
  );
}