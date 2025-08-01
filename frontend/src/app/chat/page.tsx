"use client";

import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../hooks/useTheme';
import ChatModal from '../../components/chat/ChatModal';
import React from 'react';

export default function ChatPage() {
  const { theme } = useTheme();
  const [isLoaded, setIsLoaded] = useState(false);
  const scrollPositionRef = useRef<number>(0);
  const isSubmittingRef = useRef<boolean>(false);

  // Đảm bảo component được render ở client-side
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Ngăn scroll page khi gửi tin nhắn
  useEffect(() => {
    if (!isLoaded) return;

    // Lưu vị trí scroll hiện tại
    const saveScrollPosition = () => {
      if (!isSubmittingRef.current) {
        scrollPositionRef.current = window.scrollY;
      }
    };

    // Ngăn scroll trong quá trình submit
    const preventScroll = (e: Event) => {
      if (isSubmittingRef.current) {
        e.preventDefault();
        window.scrollTo(0, scrollPositionRef.current);
      }
    };

    // Bắt đầu quá trình submit
    const handleSubmitStart = () => {
      // Lưu vị trí scroll hiện tại
      scrollPositionRef.current = window.scrollY;
      // Đánh dấu đang trong quá trình submit
      isSubmittingRef.current = true;
      
      // Đặt timeout để reset trạng thái sau khi submit hoàn tất
      setTimeout(() => {
        isSubmittingRef.current = false;
      }, 500);
    };

    // Lắng nghe sự kiện scroll để lưu vị trí và ngăn scroll khi cần
    window.addEventListener('scroll', saveScrollPosition);
    window.addEventListener('scroll', preventScroll, { passive: false });

    // Lắng nghe sự kiện submit trên tất cả các form
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      form.addEventListener('submit', handleSubmitStart, { capture: true });
    });

    // Lắng nghe sự kiện click trên các nút submit
    const submitButtons = document.querySelectorAll('button[type="submit"]');
    submitButtons.forEach(button => {
      button.addEventListener('click', handleSubmitStart, { capture: true });
    });

    // Lắng nghe sự kiện keydown để bắt Enter
    const inputs = document.querySelectorAll('input, [contenteditable="true"]');
    inputs.forEach(input => {
      input.addEventListener('keydown', (e: Event) => {
        const keyEvent = e as KeyboardEvent;
        if (keyEvent.key === 'Enter' && !keyEvent.shiftKey) {
          handleSubmitStart();
        }
      }, { capture: true });
    });

    return () => {
      // Dọn dẹp khi component unmount
      window.removeEventListener('scroll', saveScrollPosition);
      window.removeEventListener('scroll', preventScroll);
      
      forms.forEach(form => {
        form.removeEventListener('submit', handleSubmitStart);
      });
      
      submitButtons.forEach(button => {
        button.removeEventListener('click', handleSubmitStart);
      });
      
      inputs.forEach(input => {
        input.removeEventListener('keydown', handleKeyDown);
      });
    };
  }, [isLoaded]);

  // Hàm xử lý keydown để tránh lỗi TypeScript trong cleanup
  const handleKeyDown = (e: Event) => {
    const keyEvent = e as KeyboardEvent;
    if (keyEvent.key === 'Enter' && !keyEvent.shiftKey) {
      // Lưu vị trí scroll hiện tại
      scrollPositionRef.current = window.scrollY;
      // Đánh dấu đang trong quá trình submit
      isSubmittingRef.current = true;
      
      // Đặt timeout để reset trạng thái sau khi submit hoàn tất
      setTimeout(() => {
        isSubmittingRef.current = false;
      }, 500);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Phòng Chat</h1>
        
        <div className="max-w-4xl mx-auto">
          <div className="bg-opacity-90 rounded-lg shadow-lg overflow-hidden">
            {/* Hiển thị ChatModal nhưng với isOpen luôn là true và không có nút đóng */}
            <ChatModal isOpen={true} onClose={() => {}} isFullPage={true} />
          </div>
          
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Tham gia chat để thảo luận về manga, anime và kết nối với cộng đồng!</p>
          </div>
        </div>
      </div>
    </div>
  );
} 