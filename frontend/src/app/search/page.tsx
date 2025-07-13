"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { mangaApi } from "../../services/api";
import React from "react";

interface Manga {
  id: number;
  title: string;
  description: string;
  cover_image: { url: string };
  author: string;
  status: string;
  genres: string[];
  view_count: number;
  rating: number;
  total_votes: number;
  slug?: string;
  latest_chapter?: { number: number; created_at: string };
}

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [mangas, setMangas] = useState<Manga[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query) {
        setMangas([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        // Add a timestamp parameter to prevent caching
        const response = await mangaApi.getMangas({
          search: query,
          page: page,
          limit: 20,
          _: Date.now() // Add timestamp to prevent caching
        });

        setMangas(response.mangas || []);
        setTotalPages(response.pagination?.totalPages || 1);
      } catch (err) {
        console.error("Search error:", err);
        setError("Có lỗi xảy ra khi tìm kiếm. Vui lòng thử lại sau.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSearchResults();
  }, [query, page]);

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

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">
        {query ? `Kết quả tìm kiếm cho: "${query}"` : "Tìm kiếm"}
      </h1>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-900/30 border border-red-500 text-red-100 px-4 py-3 rounded-lg">
          {error}
        </div>
      ) : mangas.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-300">
            {query ? "Không tìm thấy truyện nào phù hợp với từ khóa tìm kiếm." : "Vui lòng nhập từ khóa để tìm kiếm."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {mangas.map((manga) => (
              <Link
                href={`/manga/${manga.slug || manga.id}`}
                key={manga.id}
                className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-750 transition-colors flex flex-col"
              >
                <div className="w-full aspect-[2/3] relative">
                  <img
                    src={manga.cover_image?.url || "/placeholder-manga.jpg"}
                    alt={manga.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3 flex-1">
                  <h3 className="font-bold text-white mb-2 line-clamp-2 text-sm">{manga.title}</h3>

                  <div className="flex items-center text-xs text-gray-400 mb-2">
                    <span className="flex items-center mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      {manga.view_count?.toLocaleString() || 0}
                    </span>
                    <span className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      {typeof manga.rating === 'number' ? manga.rating.toFixed(1) : "0.0"}
                      {manga.total_votes > 0 && <span className="ml-1 text-xs">({manga.total_votes})</span>}
                    </span>
                  </div>

                  {manga.latest_chapter && (
                    <div className="text-xs text-gray-300">
                      <span className="bg-gray-700 px-2 py-1 rounded">Chapter {manga.latest_chapter.number}</span>
                      <div className="mt-1 text-gray-400">{formatTimeAgo(manga.latest_chapter.created_at)}</div>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className={`px-4 py-2 rounded ${
                    page === 1
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "bg-gray-700 hover:bg-gray-600 text-white"
                  }`}
                >
                  Trước
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Logic to show pages around current page
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-4 py-2 rounded ${
                        page === pageNum
                          ? "bg-red-600 text-white"
                          : "bg-gray-700 hover:bg-gray-600 text-white"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className={`px-4 py-2 rounded ${
                    page === totalPages
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "bg-gray-700 hover:bg-gray-600 text-white"
                  }`}
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Wrap the search content in a Suspense boundary
export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
