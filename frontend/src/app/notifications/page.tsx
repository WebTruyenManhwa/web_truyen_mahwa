"use client";

import React from 'react';
import NotificationList from '../../components/NotificationList';

export default function NotificationsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Thông báo của bạn</h1>
      <NotificationList limit={20} />
    </div>
  );
}
