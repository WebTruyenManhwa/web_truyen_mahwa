"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";
import AdminLayout from "../../../components/admin/AdminLayout";
import { useAuth } from "../../../hooks/useAuth";
import React from "react";

interface NovelSeries {
  id: number;
  title: string;
  author: string;
  status: string;
  chapters_count: number;
  slug: string;
  created_at: string;
  updated_at: string;
}

interface ApiResponse {
  novel_series: NovelSeries[];
  meta: {
    total_count: number;
    total_pages: number;
    current_page: number;
    next_page: number | null;
    prev_page: number | null;
  };
}

export default function AdminNovelSeriesPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [novels, setNovels] = useState<NovelSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login");
      return;
    }

    if (!authLoading && isAuthenticated && user?.role !== "admin") {
      router.push("/");
      return;
    }

    if (!authLoading && isAuthenticated && user?.role === "admin") {
      fetchNovels(1);
    }
  }, [authLoading, isAuthenticated, user]);

  const fetchNovels = async (pageNum: number) => {
    setLoading(true);
    try {
      const response = await axios.get<ApiResponse>(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/admin/novel_series`,
        {
          params: {
            page: pageNum,
            per_page: 10,
            search: searchQuery,
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setNovels(response.data.novel_series);
      setTotalPages(response.data.meta.total_pages);
      setPage(pageNum);
    } catch (err) {
      setError("Có lỗi xảy ra khi tải dữ liệu truyện chữ.");
      console.error("Error fetching novels:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchNovels(1);
  };

  const handleDelete = async (id: number, slug: string) => {
    setIsDeleting(true);
    setDeleteId(id);
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/v1/admin/novel_series/${slug}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      fetchNovels(page);
    } catch (err) {
      setError("Có lỗi xảy ra khi xóa truyện chữ.");
      console.error("Error deleting novel:", err);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
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

  if (authLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return null;
  }

  return (
    <AdminLayout>
      <div className="bg-gray-800 p-6 rounded-lg">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Quản lý truyện chữ</h1>
          <Link
            href="/admin/novel-series/create"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Thêm truyện chữ mới
          </Link>
        </div>

        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm truyện chữ..."
              className="flex-grow px-4 py-2 bg-gray-700 text-white rounded-l-lg focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700"
            >
              Tìm kiếm
            </button>
          </div>
        </form>

        {error && <div className="bg-red-500 text-white p-4 rounded-lg mb-6">{error}</div>}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : novels.length === 0 ? (
          <div className="bg-gray-700 p-6 rounded-lg text-center">
            <p className="text-lg">Không tìm thấy truyện chữ nào.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-gray-700 rounded-lg overflow-hidden">
              <thead className="bg-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Tiêu đề
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Tác giả
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Số chương
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Ngày tạo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-600">
                {novels.map((novel) => (
                  <tr key={novel.id} className="hover:bg-gray-600">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{novel.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{novel.author}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          novel.status
                        )} text-white`}
                      >
                        {getStatusLabel(novel.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{novel.chapters_count}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{formatDate(novel.created_at)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          href={`/admin/novel-series/${novel.slug}/edit`}
                          className="text-blue-500 hover:text-blue-400"
                        >
                          Sửa
                        </Link>
                        <Link
                          href={`/admin/novel-series/${novel.slug}/chapters`}
                          className="text-green-500 hover:text-green-400"
                        >
                          Quản lý chương
                        </Link>
                        <button
                          onClick={() => handleDelete(novel.id, novel.slug)}
                          disabled={isDeleting && deleteId === novel.id}
                          className="text-red-500 hover:text-red-400"
                        >
                          {isDeleting && deleteId === novel.id ? "Đang xóa..." : "Xóa"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <div className="flex space-x-1">
              {page > 1 && (
                <button
                  onClick={() => fetchNovels(page - 1)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                >
                  Trước
                </button>
              )}

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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
                    onClick={() => fetchNovels(pageNum)}
                    className={`px-4 py-2 rounded-lg ${
                      page === pageNum
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-white hover:bg-gray-600"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {page < totalPages && (
                <button
                  onClick={() => fetchNovels(page + 1)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                >
                  Tiếp
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
