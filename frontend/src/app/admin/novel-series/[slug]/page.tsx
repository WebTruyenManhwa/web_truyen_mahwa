"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AdminLayout from "../../../../components/admin/AdminLayout";
import { useAuth } from "../../../../hooks/useAuth";
import { useNovelSeriesDetail } from "../../../../services/novelSwr";

export default function NovelSeriesDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);

  // Fetch novel series data using SWR
  const { data, error, isLoading } = useNovelSeriesDetail(slug);

  useEffect(() => {
    if (!isLoading) {
      setLoading(false);
    }
  }, [isLoading]);

  // Redirect if not admin
  if (!authLoading && !isAuthenticated) {
    router.push("/auth/login");
    return null;
  }

  if (!authLoading && isAuthenticated && (!["admin", "super_admin"].includes(user?.role ?? ""))) {
    router.push("/");
    return null;
  }

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="bg-red-500 text-white p-4 rounded-lg">
          Có lỗi xảy ra khi tải dữ liệu truyện chữ.
        </div>
      </AdminLayout>
    );
  }

  const novelSeries = data?.novel_series;

  if (!novelSeries) {
    return (
      <AdminLayout>
        <div className="bg-red-500 text-white p-4 rounded-lg">
          Không tìm thấy truyện chữ.
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="bg-gray-800 p-6 rounded-lg">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{novelSeries.title}</h1>
          <div className="flex space-x-2">
            <Link
              href={`/admin/novel-series/${slug}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Chỉnh sửa
            </Link>
            <Link
              href={`/admin/novel-series/${slug}/chapters`}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Quản lý chapter
            </Link>
            <Link
              href="/admin/novel-series"
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            >
              Quay lại danh sách
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <div className="aspect-w-2 aspect-h-3 rounded-lg overflow-hidden">
              <img
                src={novelSeries.cover_image || "/placeholder-novel.jpg"}
                alt={novelSeries.title}
                className="object-cover w-full h-full"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-300">Thông tin chi tiết</h2>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  <div className="flex">
                    <span className="font-medium text-gray-400 w-24">Tiêu đề:</span>
                    <span>{novelSeries.title}</span>
                  </div>
                  <div className="flex">
                    <span className="font-medium text-gray-400 w-24">Tác giả:</span>
                    <span>{novelSeries.author}</span>
                  </div>
                  <div className="flex">
                    <span className="font-medium text-gray-400 w-24">Slug:</span>
                    <span>{novelSeries.slug}</span>
                  </div>
                  <div className="flex">
                    <span className="font-medium text-gray-400 w-24">Trạng thái:</span>
                    <span>
                      {novelSeries.status === "ongoing" && "Đang tiến hành"}
                      {novelSeries.status === "completed" && "Hoàn thành"}
                      {novelSeries.status === "hiatus" && "Tạm ngưng"}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="font-medium text-gray-400 w-24">Ngày tạo:</span>
                    <span>{new Date(novelSeries.created_at).toLocaleDateString("vi-VN")}</span>
                  </div>
                  <div className="flex">
                    <span className="font-medium text-gray-400 w-24">Cập nhật:</span>
                    <span>{new Date(novelSeries.updated_at).toLocaleDateString("vi-VN")}</span>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-300">Mô tả</h2>
                <div className="mt-2 text-gray-300 whitespace-pre-wrap">
                  {novelSeries.description || "Không có mô tả."}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
