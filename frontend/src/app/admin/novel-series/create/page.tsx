"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import axios, { AxiosError } from "axios";
import AdminLayout from "../../../../components/admin/AdminLayout";
import { useAuth } from "../../../../hooks/useAuth";
import Link from "next/link";

interface ApiErrorResponse {
  errors?: string[];
  error?: string;
  message?: string;
}

export default function CreateNovelSeriesPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    description: "",
    cover_image: "",
    status: "ongoing",
    slug: "",
  });

  // Redirect if not admin
  if (!authLoading && !isAuthenticated) {
    router.push("/auth/login");
    return null;
  }

  if (!authLoading && isAuthenticated && (!["admin", "super_admin"].includes(user?.role ?? ""))) {
    router.push("/");
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/admin/novel_series`,
        { novel_series: formData },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      router.push(`/admin/novel-series/${response.data.novel_series.slug}`);
    } catch (err: unknown) {
      console.error("Error creating novel series:", err);
      const axiosError = err as AxiosError<ApiErrorResponse>;
      setError(
        axiosError.response?.data?.errors?.join(", ") ||
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        "Có lỗi xảy ra khi tạo truyện chữ mới."
      );
    } finally {
      setLoading(false);
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

  return (
    <AdminLayout>
      <div className="bg-gray-800 p-6 rounded-lg">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Thêm truyện chữ mới</h1>
          <Link
            href="/admin/novel-series"
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
          >
            Quay lại danh sách
          </Link>
        </div>

        {error && <div className="bg-red-500 text-white p-4 rounded-lg mb-6">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-gray-300 mb-2">Tiêu đề</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">Tác giả</label>
              <input
                type="text"
                name="author"
                value={formData.author}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">Slug (để trống sẽ tự động tạo)</label>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ten-truyen-chu"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">Trạng thái</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ongoing">Đang tiến hành</option>
                <option value="completed">Hoàn thành</option>
                <option value="hiatus">Tạm ngưng</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 mb-2">URL ảnh bìa</label>
              <input
                type="text"
                name="cover_image"
                value={formData.cover_image}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-gray-300 mb-2">Mô tả</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={6}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Đang xử lý..." : "Tạo truyện chữ"}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
