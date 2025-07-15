"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import AdminLayout from "../../../../../../components/admin/AdminLayout";
import { useAuth } from "../../../../../../hooks/useAuth";
import Link from "next/link";

interface NovelSeries {
  id: number;
  title: string;
  slug: string;
}

export default function CreateNovelChapterPage() {
  const router = useRouter();
  const params = useParams();
  const seriesSlug = params.slug as string;
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [series, setSeries] = useState<NovelSeries | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    chapter_number: "",
    slug: "",
  });

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
      fetchNovelSeries();
    }
  }, [authLoading, isAuthenticated, user, seriesSlug]);

  const fetchNovelSeries = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/admin/novel_series/${seriesSlug}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setSeries(response.data.novel_series);
    } catch (err) {
      console.error("Error fetching novel series:", err);
      setError("Có lỗi xảy ra khi tải dữ liệu truyện chữ.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/admin/novel_series/${seriesSlug}/novel_chapters`,
        { novel_chapter: formData },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      router.push(`/admin/novel-series/${seriesSlug}/chapters`);
    } catch (err: any) {
      console.error("Error creating novel chapter:", err);
      setError(
        err.response?.data?.errors?.join(", ") ||
        "Có lỗi xảy ra khi tạo chương truyện mới."
      );
    } finally {
      setSaving(false);
    }
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

  if (!isAuthenticated || user?.role !== "admin" || !series) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="bg-gray-800 p-6 rounded-lg">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Thêm chương mới</h1>
            <p className="text-gray-400">Truyện: {series.title}</p>
          </div>
          <Link
            href={`/admin/novel-series/${seriesSlug}/chapters`}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
          >
            Quay lại danh sách chương
          </Link>
        </div>

        {error && <div className="bg-red-500 text-white p-4 rounded-lg mb-6">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-gray-300 mb-2">Tiêu đề chương</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập tiêu đề chương"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">Số chương (để trống sẽ tự động tạo)</label>
              <input
                type="number"
                name="chapter_number"
                value={formData.chapter_number}
                onChange={handleChange}
                min="1"
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ví dụ: 1"
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
                placeholder="chuong-1"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-gray-300 mb-2">Nội dung</label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              rows={20}
              required
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập nội dung chương truyện..."
            ></textarea>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Đang lưu..." : "Tạo chương mới"}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
