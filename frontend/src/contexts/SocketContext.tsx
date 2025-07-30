"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocketContext = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Khởi tạo socket connection
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    console.log('Connecting to socket at:', apiUrl);
    
    // Đảm bảo URL không có /api ở cuối
    // const socketUrl = apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;
    // console.log('Actual socket URL:', socketUrl);
    
    try {
      // Tạo socket instance với các tùy chọn phù hợp
      const socketInstance = io(apiUrl, {
        transports: ['websocket'],
        path: '/cable',
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        forceNew: true,
        autoConnect: true,
      });

      console.log('Socket instance created');

      socketInstance.on('connect', () => {
        console.log('Socket connected successfully');
        setIsConnected(true);
      });

      socketInstance.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        console.error('Socket connection error details:', {
          message: error.message,
        });
      });

      socketInstance.on('reconnect', (attemptNumber) => {
        console.log(`Socket reconnected after ${attemptNumber} attempts`);
        setIsConnected(true);
      });

      socketInstance.on('reconnect_error', (error) => {
        console.error('Socket reconnection error:', error);
      });

      socketInstance.on('error', (error) => {
        console.error('Socket error:', error);
      });

      // Lắng nghe tất cả các sự kiện để debug
      socketInstance.onAny((event, ...args) => {
        console.log(`Socket event: ${event}`, args);
      });

      // Lắng nghe message từ server
      socketInstance.on('message', (data) => {
        console.log('Received message from server:', data);
      });

      setSocket(socketInstance);

      // Cleanup khi component unmount
      return () => {
        console.log('Cleaning up socket connection');
        socketInstance.disconnect();
      };
    } catch (error) {
      console.error('Error creating socket instance:', error);
      return () => {};
    }
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
