"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { notificationApi } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useRouter } from 'next/navigation';

interface Notification {
  id: number;
  title: string;
  content: string;
  read: boolean;
  notification_type: string;
  created_at: string;
  reference_id?: number;
  reference_type?: string;
}

interface NotificationParams {
  page: number;
  per_page: number;
  read?: boolean;
  type?: string;
}

export default function NotificationsPage() {
  const { theme } = useTheme();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [notificationType, setNotificationType] = useState<string>('');

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: NotificationParams = {
        page: currentPage,
        per_page: 10
      };

      if (filter === 'unread') {
        params.read = false;
      }

      if (notificationType) {
        params.type = notificationType;
      }

      const response = await notificationApi.getNotifications(params);
      setNotifications(response.notifications);
      setTotalPages(response.meta.total_pages);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, filter, notificationType]);

  useEffect(() => {
    if (isAuthenticated === false) {
      router.push('/auth/login');
    } else {
      fetchNotifications();
    }
  }, [isAuthenticated, fetchNotifications, router]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(notifications.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      ));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(notifications.map(notification => ({ ...notification, read: true })));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleDeleteNotification = async (id: number) => {
    try {
      await notificationApi.deleteNotification(id);
      setNotifications(notifications.filter(notification => notification.id !== id));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tất cả thông báo?')) {
      try {
        await notificationApi.clearAllNotifications();
        setNotifications([]);
      } catch (error) {
        console.error('Failed to clear all notifications:', error);
      }
    }
  };

  // Format thời gian
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Lấy icon cho từng loại thông báo
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'manga_crawl':
        return (
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'manga_crawl_error':
        return (
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'chapter_error_report':
        return (
          <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
        );
    }
  };

  if (isAuthenticated === false) {
    return null; // Prevent flash of content before redirect
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Thông báo của bạn</h1>

        <div className="flex flex-wrap gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'unread')}
            className={`px-3 py-2 rounded border ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-800'
            }`}
          >
            <option value="all">Tất cả</option>
            <option value="unread">Chưa đọc</option>
          </select>

          <select
            value={notificationType}
            onChange={(e) => setNotificationType(e.target.value)}
            className={`px-3 py-2 rounded border ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-800'
            }`}
          >
            <option value="">Tất cả loại</option>
            <option value="manga_crawl">Crawl truyện thành công</option>
            <option value="manga_crawl_error">Lỗi crawl truyện</option>
            <option value="chapter_error_report">Báo cáo lỗi chapter</option>
            <option value="system">Thông báo hệ thống</option>
          </select>

          <button
            onClick={handleMarkAllAsRead}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            Đánh dấu tất cả đã đọc
          </button>

          <button
            onClick={handleClearAll}
            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
          >
            Xóa tất cả
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
        </div>
      ) : notifications.length === 0 ? (
        <div className={`p-8 text-center rounded-lg ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
        }`}>
          <p className="text-xl">Không có thông báo nào</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg ${
                notification.read
                  ? theme === 'dark' ? 'bg-gray-800' : 'bg-white border border-gray-200'
                  : theme === 'dark' ? 'bg-gray-700' : 'bg-blue-50 border border-blue-200'
              }`}
            >
              <div className="flex">
                <div className="mr-4">
                  {getNotificationIcon(notification.notification_type)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <h3 className="font-semibold">{notification.title}</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatTime(notification.created_at)}
                    </p>
                  </div>
                  <p className={`mt-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {notification.content}
                  </p>
                  <div className="mt-3 flex justify-end space-x-2">
                    {!notification.read && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800"
                      >
                        Đánh dấu đã đọc
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteNotification(notification.id)}
                      className="px-2 py-1 text-xs text-red-600 hover:text-red-800"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <nav className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded ${
                currentPage === 1
                  ? 'opacity-50 cursor-not-allowed'
                  : theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              &laquo;
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 rounded ${
                  currentPage === page
                    ? 'bg-red-600 text-white'
                    : theme === 'dark'
                      ? 'bg-gray-700 hover:bg-gray-600'
                      : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded ${
                currentPage === totalPages
                  ? 'opacity-50 cursor-not-allowed'
                  : theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              &raquo;
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
