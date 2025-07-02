"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { userApi } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";

interface ReadingHistory {
  id: number;
  last_read_at: string;
  manga: {
    id: number;
    title: string;
    cover_image?: string;
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
        <h2 className="text-3xl font-bold text-white mb-8">Lịch sử đọc truyện</h2>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-100 px-4 py-3 rounded mb-6">
            {error}
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
                <Link href={`/manga/${history.manga.id}`} className="block relative">
                  <div className="aspect-[2/3] relative">
                    <Image
                      src={history.manga.cover_image || "/placeholder-image.jpg"}
                      alt={history.manga.title}
                      fill
                      className="object-cover"
                    />
                  </div>
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
                </Link>
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
