"use client";

import React, { useState } from 'react';
import { useNotifications, useUnreadNotificationsCount, useMarkNotificationAsRead, useMarkAllNotificationsAsRead, useDeleteNotification, useClearAllNotifications } from '../services/graphqlHooks';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface NotificationListProps {
  limit?: number;
}

const NotificationList: React.FC<NotificationListProps> = ({ limit = 10 }) => {
  const [page, setPage] = useState(1);
  const { data, loading, error, refetch } = useNotifications(page, limit);
  const { data: countData, refetch: refetchCount } = useUnreadNotificationsCount();

  const [markAsRead] = useMarkNotificationAsRead({
    onCompleted: () => {
      refetch();
      refetchCount();
    }
  });

  const [markAllAsRead] = useMarkAllNotificationsAsRead({
    onCompleted: () => {
      refetch();
      refetchCount();
    }
  });

  const [deleteNotification] = useDeleteNotification({
    onCompleted: () => {
      refetch();
      refetchCount();
    }
  });

  const [clearAll] = useClearAllNotifications({
    onCompleted: () => {
      refetch();
      refetchCount();
    }
  });

  const handleMarkAsRead = (id: string) => {
    markAsRead({ variables: { id } });
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleDeleteNotification = (id: string) => {
    deleteNotification({ variables: { id } });
  };

  const handleClearAll = () => {
    clearAll();
  };

  if (loading) return <div className="p-4 text-center">Đang tải thông báo...</div>;
  if (error) return <div className="p-4 text-center text-red-500">Lỗi: {error.message}</div>;

  const notifications = data?.notifications || [];
  const unreadCount = countData?.unreadNotificationsCount || 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold">
          Thông báo {unreadCount > 0 && <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">{unreadCount}</span>}
        </h2>
        <div className="space-x-2">
          <button
            onClick={handleMarkAllAsRead}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Đánh dấu đã đọc tất cả
          </button>
          <button
            onClick={handleClearAll}
            className="text-sm text-red-600 dark:text-red-400 hover:underline"
          >
            Xóa tất cả
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">Không có thông báo nào</div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {notifications.map((notification: any) => (
              <li
                key={notification.id}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
              >
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-medium">{notification.title}</h3>
                    {notification.content && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{notification.content}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: vi })}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    {!notification.read && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Đánh dấu đã đọc
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteNotification(notification.id)}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className={`px-3 py-1 rounded ${page === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            Trước
          </button>
          <button
            onClick={() => setPage(page + 1)}
            disabled={notifications.length < limit}
            className={`px-3 py-1 rounded ${notifications.length < limit ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationList;
