"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React from "react";
import { useTheme } from "../../hooks/useTheme";
import ThemeToggle from "../../components/ThemeToggle";
import { useNovelSeries } from "../../services/novelSwr";

interface NovelSeries {
  id: number;
  title: string;
  author: string;
  description: string;
  cover_image: string;
  status: string;
  slug: string;
  chapters_count: number;
  created_at: string;
  updated_at: string;
}

// interface ApiResponse {
//   novel_series: NovelSeries[];
//   meta: {
//     total_count: number;
//     total_pages: number;
//     current_page: number;
//     next_page: number | null;
//     prev_page: number | null;
//   };
// }

function NovelSeriesContent() {
  const { theme } = useTheme();
  const searchParams = useSearchParams();

  // Extract search parameters
  const currentPage = searchParams.get("page") ? parseInt(searchParams.get("page") || "1") : 1;
  const currentSearch = searchParams.get("search") || "";
  const currentStatus = searchParams.get("status") || "";
  const currentSortBy = searchParams.get("sort_by") || "created_at";
  const currentSortDirection = searchParams.get("sort_direction") || "desc";

  // State for form controls
  const [searchQuery, setSearchQuery] = useState(currentSearch);
  const [status, setStatus] = useState(currentStatus);
  const [sortBy, setSortBy] = useState(currentSortBy);
  const [sortDirection, setSortDirection] = useState(currentSortDirection);

  // Use SWR hook for data fetching with 12-hour cache
  const { data, error, isLoading } = useNovelSeries({
    page: currentPage,
    per_page: 12,
    search: currentSearch,
    status: currentStatus,
    sort_by: currentSortBy,
    sort_direction: currentSortDirection
  });

  // Extract data from the response
  const novels = data?.novel_series || [];
  const totalPages = data?.meta?.total_pages || 1;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set("page", "1");
    if (searchQuery) params.set("search", searchQuery);
    if (status) params.set("status", status);
    params.set("sort_by", sortBy);
    params.set("sort_direction", sortDirection);
    window.location.href = `/novel-series?${params.toString()}`;
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    let newSortBy = sortBy;
    let newSortDirection = sortDirection;

    if (value === "newest") {
      newSortBy = "created_at";
      newSortDirection = "desc";
    } else if (value === "oldest") {
      newSortBy = "created_at";
      newSortDirection = "asc";
    } else if (value === "title_asc") {
      newSortBy = "title";
      newSortDirection = "asc";
    } else if (value === "title_desc") {
      newSortBy = "title";
      newSortDirection = "desc";
    }

    setSortBy(newSortBy);
    setSortDirection(newSortDirection);

    const params = new URLSearchParams(window.location.search);
    params.set("sort_by", newSortBy);
    params.set("sort_direction", newSortDirection);
    window.location.href = `/novel-series?${params.toString()}`;
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setStatus(value);

    const params = new URLSearchParams(window.location.search);
    if (value) {
      params.set("status", value);
    } else {
      params.delete("status");
    }
    params.set("page", "1");
    window.location.href = `/novel-series?${params.toString()}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ongoing":
        return "Đang tiến hành";
      case "completed":
        return "Hoàn thành";
      case "hiatus":
        return "Tạm ngưng";
      default:
        return "Không xác định";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ongoing":
        return "bg-blue-600";
      case "completed":
        return "bg-green-600";
      case "hiatus":
        return "bg-yellow-600";
      default:
        return "bg-gray-600";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Truyện Chữ</h1>
        <ThemeToggle className="px-3 py-2" showLabel />
      </div>

      {/* Filters */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white border border-gray-200'} rounded-lg p-4 mb-8`}>
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm truyện..."
              className={`w-full px-4 py-2 ${
                theme === 'dark'
                  ? 'bg-gray-700 text-white focus:ring-blue-500'
                  : 'bg-gray-100 text-gray-900 focus:ring-blue-400'
              } rounded-lg focus:outline-none focus:ring-2`}
            />
          </div>
          <div>
            <select
              value={status}
              onChange={handleStatusChange}
              className={`w-full px-4 py-2 ${
                theme === 'dark'
                  ? 'bg-gray-700 text-white focus:ring-blue-500'
                  : 'bg-gray-100 text-gray-900 focus:ring-blue-400'
              } rounded-lg focus:outline-none focus:ring-2`}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="ongoing">Đang tiến hành</option>
              <option value="completed">Hoàn thành</option>
              <option value="hiatus">Tạm ngưng</option>
            </select>
          </div>
          <div>
            <select
              value={
                sortBy === "created_at" && sortDirection === "desc"
                  ? "newest"
                  : sortBy === "created_at" && sortDirection === "asc"
                  ? "oldest"
                  : sortBy === "title" && sortDirection === "asc"
                  ? "title_asc"
                  : "title_desc"
              }
              onChange={handleSortChange}
              className={`w-full px-4 py-2 ${
                theme === 'dark'
                  ? 'bg-gray-700 text-white focus:ring-blue-500'
                  : 'bg-gray-100 text-gray-900 focus:ring-blue-400'
              } rounded-lg focus:outline-none focus:ring-2`}
            >
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="title_asc">Tên A-Z</option>
              <option value="title_desc">Tên Z-A</option>
            </select>
          </div>
          <div className="md:col-span-4">
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Tìm kiếm
            </button>
          </div>
        </form>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-500 text-white p-4 rounded-lg mb-8">Có lỗi xảy ra khi tải dữ liệu truyện chữ.</div>
      ) : novels.length === 0 ? (
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white border border-gray-200'} p-8 rounded-lg text-center`}>
          <p className="text-xl">Không tìm thấy truyện chữ nào.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {novels.map((novel: NovelSeries) => (
            <Link
              key={novel.id}
              href={`/novel-series/${novel.slug}`}
              className={`block ${
                theme === 'dark'
                  ? 'bg-gray-800 hover:bg-gray-700'
                  : 'bg-white hover:bg-gray-50 border border-gray-200'
              } rounded-lg overflow-hidden transition-colors`}
            >
              <div className="relative h-60">
                <img
                  src={novel.cover_image || "/placeholder-novel.jpg"}
                  alt={novel.title}
                  className="w-full h-full object-cover"
                />
                <div
                  className={`absolute top-2 right-2 ${getStatusColor(
                    novel.status
                  )} text-white text-xs px-2 py-1 rounded-full`}
                >
                  {getStatusLabel(novel.status)}
                </div>
              </div>
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-2 line-clamp-2">{novel.title}</h2>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                  Tác giả: {novel.author}
                </p>
                <div className="flex justify-between items-center text-xs">
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                    {novel.chapters_count} chương
                  </span>
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                    {formatDate(novel.updated_at)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <div className="flex flex-wrap gap-2">
            {currentPage > 1 && (
              <Link
                href={`/novel-series?${new URLSearchParams({
                  ...Object.fromEntries(searchParams.entries()),
                  page: (currentPage - 1).toString(),
                })}`}
                className={`px-4 py-2 ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                } rounded-lg`}
              >
                Trước
              </Link>
            )}

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <Link
                  key={i}
                  href={`/novel-series?${new URLSearchParams({
                    ...Object.fromEntries(searchParams.entries()),
                    page: pageNum.toString(),
                  })}`}
                  className={`px-4 py-2 rounded-lg ${
                    currentPage === pageNum
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-white hover:bg-gray-600"
                  }`}
                >
                  {pageNum}
                </Link>
              );
            })}

            {currentPage < totalPages && (
              <Link
                href={`/novel-series?${new URLSearchParams({
                  ...Object.fromEntries(searchParams.entries()),
                  page: (currentPage + 1).toString(),
                })}`}
                className={`px-4 py-2 ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                } rounded-lg`}
              >
                Tiếp
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Loading fallback for Suspense
function LoadingFallback() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    </div>
  );
}

export default function NovelSeriesPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <NovelSeriesContent />
    </Suspense>
  );
}
