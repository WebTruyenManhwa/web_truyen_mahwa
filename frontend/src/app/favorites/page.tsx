"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useAuth } from "../../hooks/useAuth";
import React from "react";
import { useFavorites } from "../../services/swrApi";
import { userAPI } from "../../services/swrApi";

interface Manga {
  id: number;
  title: string;
  description: string;
  cover_image: { url: string };
  cover_image_url?: string;
  author: string;
  status: string;
  genres: string[];
  view_count: number;
  rating: number;
  total_votes: number;
  slug?: string;
  latest_chapter?: { number: number; created_at: string };
}

interface Favorite {
  id: number;
  manga: Manga;
  created_at: string;
}

function FavoritesContent() {
  const { isAuthenticated } = useAuth();
  const { data, error, isLoading, mutate } = useFavorites(isAuthenticated);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [removingId, setRemovingId] = useState<number | null>(null);

  useEffect(() => {
    if (data) {
      setFavorites(data);
    }
  }, [data]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 24) {
      return `${diffHours} giờ trước`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} ngày trước`;
    }
  };

  const handleRemoveFavorite = async (mangaId: number) => {
    try {
      setRemovingId(mangaId);
      
      // Call the API to toggle favorite (which will remove it since it's already a favorite)
      await userAPI.toggleFavorite(mangaId);
      
      // Update the local state to remove the manga
      setFavorites(favorites.filter(fav => fav.manga.id !== mangaId));
      
      // Refresh the data
      mutate();
    } catch (error) {
      console.error('Error removing favorite:', error);
    } finally {
      setRemovingId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">Truyện yêu thích</h1>
          <p className="text-gray-300 mb-4">Vui lòng đăng nhập để xem danh sách truyện yêu thích của bạn.</p>
          <Link href="/login" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-900/30 border border-red-500 text-red-100 px-4 py-3 rounded-lg">
          Có lỗi xảy ra khi tải danh sách truyện yêu thích. Vui lòng thử lại sau.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Truyện yêu thích của bạn</h1>

      {favorites.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-300">Bạn chưa có truyện yêu thích nào.</p>
          <Link href="/" className="inline-block mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">
            Khám phá truyện
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {favorites.map((favorite) => {
            const manga = favorite.manga;
            return (
              <div key={favorite.id} className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-750 transition-colors flex flex-col relative group">
                <Link
                  href={`/manga/${manga.slug || manga.id}`}
                  className="block"
                >
                  <div className="w-full aspect-[2/3] relative">
                    <img
                      src={manga.cover_image?.url || manga.cover_image_url || "/placeholder-manga.jpg"}
                      alt={manga.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <h3 className="font-bold text-white mb-2 line-clamp-2 text-sm text-center">{manga.title}</h3>

                    <div className="flex items-center justify-center text-xs text-gray-400 mb-2">
                      <span className="flex items-center mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {manga.view_count?.toLocaleString() || 0}
                      </span>
                      <span className="flex items-center">
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-3 w-3 mr-1" 
                          fill={manga.total_votes > 0 ? "#FBBF24" : "none"} 
                          viewBox="0 0 24 24" 
                          stroke={manga.total_votes > 0 ? "#FBBF24" : "currentColor"}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        {Number(manga.rating || 0).toFixed(1)}
                        {manga.total_votes > 0 && <span className="ml-1 text-xs">({manga.total_votes})</span>}
                      </span>
                    </div>

                    {manga.latest_chapter && (
                      <div className="text-xs text-gray-300 flex justify-between items-center mt-auto">
                        <span className="bg-gray-700 px-2 py-1 rounded">Chapter {manga.latest_chapter.number}</span>
                        <span className="text-gray-400">{formatTimeAgo(manga.latest_chapter.created_at)}</span>
                      </div>
                    )}
                  </div>
                </Link>
                
                {/* Remove button */}
                <button 
                  onClick={() => handleRemoveFavorite(manga.id)}
                  disabled={removingId === manga.id}
                  className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Xóa khỏi danh sách yêu thích"
                >
                  {removingId === manga.id ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent border-white"></div>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Wrap the favorites content in a Suspense boundary
export default function FavoritesPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    }>
      <FavoritesContent />
    </Suspense>
  );
}