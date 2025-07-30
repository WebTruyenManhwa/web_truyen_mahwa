"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createConsumer, Consumer } from '@rails/actioncable';

interface ActionCableContextType {
  consumer: Consumer | null;
  isConnected: boolean;
}

const ActionCableContext = createContext<ActionCableContextType>({
  consumer: null,
  isConnected: false,
});

export const useActionCableContext = () => useContext(ActionCableContext);

export const ActionCableProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [consumer, setConsumer] = useState<Consumer | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Khởi tạo ActionCable connection
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    console.log('Connecting to ActionCable at:', apiUrl);
    
    try {
      // Tạo ActionCable consumer
      // Loại bỏ /api nếu có trong URL
      const baseUrl = apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;
      console.log('Actual ActionCable URL:', `${baseUrl}/cable`);
      const actionCableConsumer = createConsumer(`${baseUrl}/cable`);
      
      console.log('ActionCable consumer created');
      setConsumer(actionCableConsumer);
      
      // Đăng ký sự kiện connected
      const connectionMonitor = {
        connected() {
          console.log('ActionCable connected successfully');
          setIsConnected(true);
        },
        disconnected() {
          console.log('ActionCable disconnected');
          setIsConnected(false);
        },
        rejected() {
          console.log('ActionCable connection rejected');
          setIsConnected(false);
        }
      };
      
      // Đăng ký kênh monitor
      const monitorChannel = actionCableConsumer.subscriptions.create('MonitorChannel', connectionMonitor);
      
      // Cleanup khi component unmount
      return () => {
        console.log('Cleaning up ActionCable connection');
        monitorChannel.unsubscribe();
        actionCableConsumer.disconnect();
      };
    } catch (error) {
      console.error('Error creating ActionCable consumer:', error);
      return () => {};
    }
  }, []);

  return (
    <ActionCableContext.Provider value={{ consumer, isConnected }}>
      {children}
    </ActionCableContext.Provider>
  );
}; 