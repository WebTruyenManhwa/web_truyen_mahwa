"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import AdminSidebar from "../../../../../components/admin/AdminSidebar";
import { mangaApi, chapterApi } from "../../../../../services/api";
import React from "react";

interface Chapter {
  id: number;
  number: number;
  title: string;
  createdAt: string;
  viewCount: number;
}

interface Manga {
  id: number;
  title: string;
}

type Props = {
  params: Promise<{ id: string }>;
};

export default function ManageChapters(props: Props) {
  const { id: mangaId } = use(props.params);
  const [manga, setManga] = useState<Manga | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch manga details
        const mangaData = await mangaApi.getManga(mangaId);
        setManga(mangaData);
        
        // Fetch chapters
        const chaptersData = await mangaApi.getMangaChapters(mangaId);
        setChapters(chaptersData || []);
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setError("Không thể tải dữ liệu. Vui lòng thử lại sau.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [mangaId]);

  const handleDeleteChapter = async (chapterId: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa chapter này?")) {
      return;
    }

    try {
      await chapterApi.deleteChapter(mangaId, chapterId);
      setChapters(chapters.filter(chapter => chapter.id !== chapterId));
    } catch (err) {
      console.error("Failed to delete chapter:", err);
      alert("Xóa chapter thất bại. Vui lòng thử lại sau.");
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-900">
      <AdminSidebar />

      <main className="flex-1 p-6">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Quản lý chapter
              </h1>
              <p className="text-gray-400">
                {manga ? `Truyện: ${manga.title}` : "Đang tải..."}
              </p>
            </div>
            <div className="space-x-2">
              <Link
                href={`/admin/mangas/${mangaId}/chapters/create`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                Thêm chapter mới
              </Link>
              <Link
                href={`/admin/mangas/${mangaId}`}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
              >
                Quay lại
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-100 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : chapters.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">Chưa có chapter nào</p>
              <Link
                href={`/admin/mangas/${mangaId}/chapters/create`}
                className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                Thêm chapter đầu tiên
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Số chapter
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Tiêu đề
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Ngày tạo
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Lượt xem
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {chapters.sort((a, b) => b.number - a.number).map((chapter) => (
                    <tr key={chapter.id} className="hover:bg-gray-750">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {chapter.number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {chapter.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {new Date(chapter.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {chapter.viewCount?.toLocaleString() || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/manga/${mangaId}/chapter/${chapter.id}`}
                          className="text-blue-400 hover:text-blue-300 mr-4"
                          target="_blank"
                        >
                          Xem
                        </Link>
                        <Link
                          href={`/admin/mangas/${mangaId}/chapters/${chapter.id}/edit`}
                          className="text-blue-400 hover:text-blue-300 mr-4"
                        >
                          Sửa
                        </Link>
                        <button
                          onClick={() => handleDeleteChapter(chapter.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 