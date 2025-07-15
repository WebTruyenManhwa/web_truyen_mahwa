"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import AdminLayout from "../../../../../components/admin/AdminLayout";
import { useAuth } from "../../../../../hooks/useAuth";
import Link from "next/link";

interface NovelSeries {
  id: number;
  title: string;
  slug: string;
}

interface NovelChapter {
  id: number;
  title: string;
  chapter_number: number;
  slug: string;
  created_at: string;
  updated_at: string;
}

interface ApiResponse {
  novel_chapters: NovelChapter[];
  novel_series: NovelSeries;
  meta: {
    total_count: number;
    total_pages: number;
    current_page: number;
    next_page: number | null;
    prev_page: number | null;
  };
}

export default function NovelChaptersPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chapters, setChapters] = useState<NovelChapter[]>([]);
  const [series, setSeries] = useState<NovelSeries | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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
      fetchChapters(1);
    }
  }, [authLoading, isAuthenticated, user, slug]);

  const fetchChapters = async (pageNum: number) => {
    setLoading(true);
    try {
      const response = await axios.get<ApiResponse>(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/admin/novel_series/${slug}/novel_chapters`,
        {
          params: {
            page: pageNum,
            per_page: 20,
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setChapters(response.data.novel_chapters);
      setSeries(response.data.novel_series);
      setTotalPages(response.data.meta.total_pages);
      setPage(pageNum);
    } catch (err) {
      console.error("Error fetching chapters:", err);
      setError("Có lỗi xảy ra khi tải dữ liệu chương truyện.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (chapterId: number, chapterSlug: string) => {
    setIsDeleting(true);
    setDeleteId(chapterId);
    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/admin/novel_chapters/${chapterSlug}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      fetchChapters(page);
    } catch (err) {
      console.error("Error deleting chapter:", err);
      setError("Có lỗi xảy ra khi xóa chương truyện.");
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
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  if (authLoading || loading) {
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
          <div>
            <h1 className="text-2xl font-bold">Quản lý chương truyện</h1>
            {series && <p className="text-gray-400">Truyện: {series.title}</p>}
          </div>
          <div className="flex space-x-2">
            <Link
              href={`/admin/novel-series/${slug}/chapters/create`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Thêm chương mới
            </Link>
            <Link
              href="/admin/novel-series"
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            >
              Quay lại danh sách truyện
            </Link>
          </div>
        </div>

        {error && <div className="bg-red-500 text-white p-4 rounded-lg mb-6">{error}</div>}

        {chapters.length === 0 ? (
          <div className="bg-gray-700 p-6 rounded-lg text-center">
            <p className="text-lg">Chưa có chương truyện nào.</p>
            <Link
              href={`/admin/novel-series/${slug}/chapters/create`}
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Thêm chương đầu tiên
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-gray-700 rounded-lg overflow-hidden">
              <thead className="bg-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Số chương
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Tiêu đề
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Ngày tạo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Cập nhật
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-600">
                {chapters.map((chapter) => (
                  <tr key={chapter.id} className="hover:bg-gray-600">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">Chương {chapter.chapter_number}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-white">{chapter.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{formatDate(chapter.created_at)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{formatDate(chapter.updated_at)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          href={`/admin/novel-series/${slug}/chapters/${chapter.slug || chapter.id}/edit`}
                          className="text-blue-500 hover:text-blue-400"
                        >
                          Sửa
                        </Link>
                        <button
                          onClick={() => handleDelete(chapter.id, chapter.slug)}
                          disabled={isDeleting && deleteId === chapter.id}
                          className="text-red-500 hover:text-red-400"
                        >
                          {isDeleting && deleteId === chapter.id ? "Đang xóa..." : "Xóa"}
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
                  onClick={() => fetchChapters(page - 1)}
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
                    onClick={() => fetchChapters(pageNum)}
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
                  onClick={() => fetchChapters(page + 1)}
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
