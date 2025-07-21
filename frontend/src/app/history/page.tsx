/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
// import Image from "next/image";
import { userApi } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";

interface ReadingHistory {
  id: number;
  last_read_at: string;
  manga: {
    id: number;
    title: string;
    cover_image?: { url: string };
  };
  chapter: {
    id: number;
    number: number;
    title: string;
  };
}

export default function HistoryPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [histories, setHistories] = useState<ReadingHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchHistories = async () => {
      try {
        const data = await userApi.getReadingHistory();
        setHistories(data);
      } catch (err) {
        console.error("Failed to fetch reading history:", err);
        setError("Không thể tải lịch sử đọc truyện. Vui lòng thử lại sau.");
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchHistories();
    } else if (!authLoading) {
      setIsLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  // Xóa một lịch sử đọc
  const handleDeleteHistory = async (id: number) => {
    try {
      setIsDeleting(true);
      await userApi.deleteReadingHistory(id);
      setHistories(histories.filter(history => history.id !== id));
      setSuccess("Đã xóa lịch sử đọc thành công");
      
      // Tự động ẩn thông báo thành công sau 3 giây
      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      console.error("Failed to delete reading history:", err);
      setError("Không thể xóa lịch sử đọc truyện. Vui lòng thử lại sau.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Xóa tất cả lịch sử đọc
  const handleDeleteAllHistory = async () => {
    if (!confirm("Bạn có chắc chắn muốn xóa tất cả lịch sử đọc truyện?")) {
      return;
    }
    
    try {
      setIsDeleting(true);
      await userApi.deleteAllReadingHistory();
      setHistories([]);
      setSuccess("Đã xóa tất cả lịch sử đọc thành công");
      
      // Tự động ẩn thông báo thành công sau 3 giây
      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      console.error("Failed to delete all reading history:", err);
      setError("Không thể xóa lịch sử đọc truyện. Vui lòng thử lại sau.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 mx-auto"></div>
            <p className="mt-4 text-gray-400">Đang tải...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Lịch sử đọc truyện</h2>
            <div className="bg-gray-800 rounded-lg p-8">
              <p className="text-gray-300 mb-4">Vui lòng đăng nhập để xem lịch sử đọc truyện của bạn.</p>
              <Link
                href="/auth/login"
                className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                Đăng nhập
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-white">Lịch sử đọc truyện</h2>
          
          {histories.length > 0 && (
            <button
              onClick={handleDeleteAllHistory}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              {isDeleting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang xử lý...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Xóa tất cả
                </>
              )}
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-100 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-900/50 border border-green-500 text-green-100 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        {histories.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-300">Bạn chưa đọc truyện nào.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {histories.map((history) => (
              <div key={history.id} className="bg-gray-800 rounded-lg overflow-hidden w-full max-w-[200px]">
                <div className="relative">
                  <Link href={`/manga/${history.manga.id}`} className="block">
                    <div className="aspect-[2/3] relative">
                      <img
                        src={history.manga.cover_image?.url ?? "/placeholder-image.jpg"}
                        alt={history.manga.title}
                        className="object-cover w-full h-full"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <h3 className="text-sm font-bold text-white mb-1 line-clamp-1">
                          {history.manga.title}
                        </h3>
                        <p className="text-xs text-gray-300 line-clamp-1">
                          Đã đọc: Chapter {history.chapter.number} - {history.chapter.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(history.last_read_at).toLocaleDateString("vi-VN", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={() => handleDeleteHistory(history.id)}
                    disabled={isDeleting}
                    className="absolute top-2 right-2 bg-gray-900/70 hover:bg-red-700 text-white p-1.5 rounded-full"
                    title="Xóa khỏi lịch sử"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <div className="p-2 border-t border-gray-700">
                  <Link
                    href={`/manga/${history.manga.id}/chapter/${history.chapter.id}`}
                    className="block w-full bg-red-600 hover:bg-red-700 text-white text-center py-1.5 px-3 rounded text-sm"
                  >
                    Đọc tiếp
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 
