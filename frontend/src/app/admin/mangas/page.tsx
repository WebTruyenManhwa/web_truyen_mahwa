"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import AdminSidebar from "../../../components/admin/AdminSidebar";
import { mangaApi } from "../../../services/api";

interface Manga {
  id: number;
  title: string;
  coverImage: string;
  status: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}

export default function ManageManga() {
  const [mangas, setMangas] = useState<Manga[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchMangas();
  }, [currentPage]);

  const fetchMangas = async () => {
    try {
      setIsLoading(true);
      const response = await mangaApi.getMangas({
        page: currentPage,
        limit: 10,
        search: searchTerm || undefined
      });
      
      setMangas(response.mangas || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (err) {
      console.error("Failed to fetch mangas:", err);
      setError("Không thể tải danh sách truyện. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchMangas();
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa truyện này?")) {
      return;
    }

    try {
      await mangaApi.deleteManga(id);
      setMangas(mangas.filter(manga => manga.id !== id));
    } catch (err) {
      console.error("Failed to delete manga:", err);
      alert("Xóa truyện thất bại. Vui lòng thử lại sau.");
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-900">
      <AdminSidebar />

      <main className="flex-1 p-6">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold mb-2">Quản lý truyện</h1>
            <Link
              href="/admin/mangas/create"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Thêm truyện mới
            </Link>
          </div>
          <p className="text-gray-400">Quản lý danh sách truyện trong hệ thống</p>
        </div>

        {/* Search bar */}
        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm theo tên truyện..."
              className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Tìm kiếm
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-100 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Manga list */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : mangas.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">Không tìm thấy truyện nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Truyện
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Tác giả
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Ngày cập nhật
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {mangas.map((manga) => (
                    <tr key={manga.id} className="hover:bg-gray-750">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-12 w-8 flex-shrink-0 mr-4 relative">
                            <Image
                              src={manga.coverImage || "/placeholder-manga.jpg"}
                              alt={manga.title}
                              fill
                              className="object-cover rounded"
                              sizes="32px"
                            />
                          </div>
                          <div className="text-sm font-medium text-white">
                            {manga.title}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {manga.author}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${manga.status === 'ongoing' ? 'bg-green-900 text-green-200' : 
                            manga.status === 'completed' ? 'bg-blue-900 text-blue-200' : 
                            manga.status === 'hiatus' ? 'bg-yellow-900 text-yellow-200' : 
                            'bg-red-900 text-red-200'}`}>
                          {manga.status === 'ongoing' ? 'Đang tiến hành' : 
                           manga.status === 'completed' ? 'Hoàn thành' : 
                           manga.status === 'hiatus' ? 'Tạm ngưng' : 'Đã hủy'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {new Date(manga.updatedAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/admin/mangas/${manga.id}`}
                          className="text-blue-400 hover:text-blue-300 mr-4"
                        >
                          Sửa
                        </Link>
                        <button
                          onClick={() => handleDelete(manga.id)}
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

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="px-6 py-4 flex justify-between items-center border-t border-gray-700">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg ${
                  currentPage === 1
                    ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bg-gray-700 text-white hover:bg-gray-600"
                }`}
              >
                Trang trước
              </button>
              
              <span className="text-gray-300">
                Trang {currentPage} / {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-lg ${
                  currentPage === totalPages
                    ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bg-gray-700 text-white hover:bg-gray-600"
                }`}
              >
                Trang sau
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 