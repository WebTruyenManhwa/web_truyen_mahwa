"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { userApi } from '../services/api';
import React from 'react';

// Định nghĩa kiểu dữ liệu cho user
interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  avatar?: string;
}

// Định nghĩa kiểu dữ liệu cho context
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

// Tạo context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Kiểm tra xem user đã đăng nhập chưa khi component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setUser(null);
          setIsLoading(false);
          return;
        }

        // Xác thực token với backend
        const currentUser = await userApi.getCurrentUser();
        setUser(currentUser);
        localStorage.setItem('user', JSON.stringify(currentUser));
      } catch (error) {
        console.error('Failed to authenticate user:', error);
        // Token không hợp lệ, đăng xuất
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Đăng nhập
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await userApi.login({ email, password });
      setUser(response.user);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Đăng ký
  const register = async (username: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      await userApi.register({ username, email, password });
      // Đăng nhập sau khi đăng ký thành công
      await login(email, password);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Đăng xuất
  const logout = () => {
    userApi.logout();
    setUser(null);
  };

  // Cập nhật thông tin user
  const updateUser = async (userData: Partial<User>) => {
    setIsLoading(true);
    try {
      const updatedUser = await userApi.updateUser(userData as any);
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook để sử dụng auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth; 