"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import AdminSidebar from "../../../components/admin/AdminSidebar";
import { adminApi } from "../../../services/api";

// Interface cho dữ liệu từ API
interface DashboardData {
  dashboardStats: {
    totalMangas: number;
    totalUsers: number;
    totalViews: number;
    newUsersToday: number;
    newMangasToday: number;
    viewsToday: number;
  };
  recentMangas: {
    id: number;
    title: string;
    slug: string;
    chapters: number;
    view_count: number;
    status: string;
    updatedAt: string;
  }[];
  recentUsers: {
    id: number;
    username: string;
    email: string;
    registeredAt: string;
    role: string;
  }[];
}

// Dữ liệu mặc định khi đang tải
const defaultData: DashboardData = {
  dashboardStats: {
    totalMangas: 0,
    totalUsers: 0,
    totalViews: 0,
    newUsersToday: 0,
    newMangasToday: 0,
    viewsToday: 0,
  },
  recentMangas: [],
  recentUsers: [],
};

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData>(defaultData);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [backupLoading, setBackupLoading] = useState<boolean>(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [backupSuccess, setBackupSuccess] = useState<string | boolean>(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await adminApi.getDashboardStats();
        setDashboardData(response);
        setError(null);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Không thể tải dữ liệu dashboard. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Xử lý backup database
  const handleBackupDatabase = async () => {
    try {
      setBackupLoading(true);
      setBackupError(null);
      setBackupSuccess(false);

      const result = await adminApi.backupDatabase();

      if (result.success) {
        if (result.message) {
          setBackupSuccess(result.message);
        } else {
          setBackupSuccess("Backup thành công! File đang được tải xuống...");
        }
        // Tự động ẩn thông báo thành công sau 5 giây
        setTimeout(() => setBackupSuccess(false), 5000);
      } else {
        setBackupError(result.error || "Có lỗi xảy ra khi tạo backup");
      }
    } catch (err) {
      console.error("Error backing up database:", err);
      setBackupError("Có lỗi xảy ra khi tạo backup. Vui lòng thử lại sau.");
    } finally {
      setBackupLoading(false);
    }
  };

  // Hiển thị trạng thái loading
  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-900">
        <AdminSidebar />
        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-400">Đang tải dữ liệu...</p>
          </div>
        </main>
      </div>
    );
  }

  // Hiển thị thông báo lỗi
  if (error) {
    return (
      <div className="flex min-h-screen bg-gray-900">
        <AdminSidebar />
        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="bg-red-900 text-red-200 p-4 rounded-lg mb-4">
              <p>{error}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Thử lại
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Destructuring data cho dễ sử dụng
  const { dashboardStats, recentMangas, recentUsers } = dashboardData;

  // Format status từ enum sang text
  const formatStatus = (status: string) => {
    switch (status) {
      case "ongoing":
        return "Đang tiến hành";
      case "completed":
        return "Hoàn thành";
      case "hiatus":
        return "Tạm ngưng";
      case "cancelled":
        return "Đã hủy";
      default:
        return status;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-900">
      <AdminSidebar />

      <main className="flex-1 p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-400">Xin chào Admin, chào mừng trở lại!</p>
        </div>

        {/* Admin Actions */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Thao tác quản trị</h2>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="font-medium mb-2">Backup Database</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Tạo bản sao lưu cơ sở dữ liệu. Hữu ích trước khi nâng cấp hoặc thay đổi lớn.
                </p>
                <button
                  onClick={handleBackupDatabase}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center text-sm"
                  disabled={backupLoading}
                >
                  {backupLoading ? (
                    <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  )}
                  {backupLoading ? "Đang tạo backup..." : "Tải xuống backup"}
                </button>
                {backupSuccess && (
                  <p className="text-xs text-green-400 mt-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {typeof backupSuccess === 'string' ? backupSuccess : 'Backup thành công!'}
                  </p>
                )}
                {backupError && (
                  <p className="text-xs text-red-400 mt-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {backupError}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-gray-400 mb-2">Tổng số truyện</h3>
            <div className="flex items-center">
              <span className="text-3xl font-bold">{dashboardStats.totalMangas.toLocaleString()}</span>
              <span className="ml-2 text-green-500 text-sm">
                +{dashboardStats.newMangasToday} hôm nay
              </span>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-gray-400 mb-2">Tổng số người dùng</h3>
            <div className="flex items-center">
              <span className="text-3xl font-bold">{dashboardStats.totalUsers.toLocaleString()}</span>
              <span className="ml-2 text-green-500 text-sm">
                +{dashboardStats.newUsersToday} hôm nay
              </span>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-gray-400 mb-2">Tổng lượt xem</h3>
            <div className="flex items-center">
              <span className="text-3xl font-bold">
                {dashboardStats.totalViews >= 1000000
                  ? `${(dashboardStats.totalViews / 1000000).toFixed(2)}M`
                  : dashboardStats.totalViews >= 1000
                  ? `${(dashboardStats.totalViews / 1000).toFixed(0)}K`
                  : dashboardStats.totalViews}
              </span>
              <span className="ml-2 text-green-500 text-sm">
                +{dashboardStats.viewsToday >= 1000
                  ? `${(dashboardStats.viewsToday / 1000).toFixed(0)}K`
                  : dashboardStats.viewsToday} hôm nay
              </span>
            </div>
          </div>
        </div>

        {/* Recent Mangas */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Truyện mới cập nhật</h2>
            <Link href="/admin/mangas" className="text-blue-500 hover:underline">
              Xem tất cả
            </Link>
          </div>

          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Tên truyện
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Số chương
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Lượt xem
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Cập nhật
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {recentMangas.map((manga) => (
                    <tr key={manga.id} className="hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/admin/mangas/${manga.id}`} className="text-blue-400 hover:underline">
                          {manga.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{manga.chapters}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {manga.view_count >= 1000000
                          ? `${(manga.view_count / 1000000).toFixed(1)}M`
                          : manga.view_count >= 1000
                          ? `${(manga.view_count / 1000).toFixed(0)}K`
                          : manga.view_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            manga.status === "ongoing"
                              ? "bg-green-900 text-green-300"
                              : manga.status === "completed"
                              ? "bg-blue-900 text-blue-300"
                              : "bg-yellow-900 text-yellow-300"
                          }`}
                        >
                          {formatStatus(manga.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                        {new Date(manga.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/admin/mangas/${manga.id}/edit`} className="text-blue-500 hover:text-blue-400 mr-4">
                          Sửa
                        </Link>
                        <button className="text-red-500 hover:text-red-400">
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Users */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Người dùng mới đăng ký</h2>
            <Link href="/admin/users" className="text-blue-500 hover:underline">
              Xem tất cả
            </Link>
          </div>

          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Tên người dùng
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Vai trò
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Ngày đăng ký
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {recentUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/admin/users/${user.id}`} className="text-blue-400 hover:underline">
                          {user.username}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.role === "admin"
                              ? "bg-red-900 text-red-300"
                              : user.role === "moderator"
                              ? "bg-yellow-900 text-yellow-300"
                              : "bg-gray-700 text-gray-300"
                          }`}
                        >
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                        {new Date(user.registeredAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/admin/users/${user.id}/edit`} className="text-blue-500 hover:text-blue-400 mr-4">
                          Sửa
                        </Link>
                        <button className="text-red-500 hover:text-red-400">
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
