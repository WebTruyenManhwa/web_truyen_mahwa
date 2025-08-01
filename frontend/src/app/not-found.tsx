"use client";

import Link from 'next/link';
import { useTheme } from '../hooks/useTheme';
import React from 'react';

export default function NotFound() {
  const { theme } = useTheme();
  
  return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-6xl font-bold text-red-600 mb-6">404</h1>
        <h2 className="text-3xl font-bold mb-6">Trang không tồn tại</h2>
        <p className="text-lg mb-8">
          Rất tiếc, trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
        </p>
        <Link href="/" className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full text-lg font-medium">
          Quay lại trang chủ
        </Link>
      </div>
    </div>
  );
} 