"use client";

import Link from "next/link";
import AdminSidebar from "@/components/admin/AdminSidebar";

// Mock data - sẽ được thay thế bằng API call thực tế
const dashboardStats = {
  totalMangas: 1250,
  totalUsers: 15420,
  totalViews: 2450000,
  newUsersToday: 124,
  newMangasToday: 15,
  viewsToday: 85000,
};

const recentMangas = [
  {
    id: 1,
    title: "One Piece",
    chapters: 1088,
    views: 15000000,
    status: "Đang tiến hành",
    updatedAt: "2023-08-10",
  },
  {
    id: 3,
    title: "Jujutsu Kaisen",
    chapters: 223,
    views: 8000000,
    status: "Đang tiến hành",
    updatedAt: "2023-08-09",
  },
  {
    id: 5,
    title: "My Hero Academia",
    chapters: 402,
    views: 7800000,
    status: "Đang tiến hành",
    updatedAt: "2023-08-08",
  },
  {
    id: 4,
    title: "Demon Slayer",
    chapters: 205,
    views: 9500000,
    status: "Hoàn thành",
    updatedAt: "2023-08-07",
  },
  {
    id: 2,
    title: "Naruto",
    chapters: 700,
    views: 12000000,
    status: "Hoàn thành",
    updatedAt: "2023-08-06",
  },
];

const recentUsers = [
  {
    id: 1,
    username: "manga_lover",
    email: "manga_lover@example.com",
    registeredAt: "2023-08-10",
    role: "User",
  },
  {
    id: 2,
    username: "anime_fan",
    email: "anime_fan@example.com",
    registeredAt: "2023-08-09",
    role: "User",
  },
  {
    id: 3,
    username: "otaku123",
    email: "otaku123@example.com",
    registeredAt: "2023-08-08",
    role: "User",
  },
  {
    id: 4,
    username: "manga_admin",
    email: "admin@mangaverse.com",
    registeredAt: "2023-08-07",
    role: "Admin",
  },
  {
    id: 5,
    username: "manga_mod",
    email: "mod@mangaverse.com",
    registeredAt: "2023-08-06",
    role: "Moderator",
  },
];

export default function AdminDashboard() {
  return (
    <div className="flex min-h-screen bg-gray-900">
      <AdminSidebar />
      
      <main className="flex-1 p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-400">Xin chào Admin, chào mừng trở lại!</p>
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
              <span className="text-3xl font-bold">{(dashboardStats.totalViews / 1000000).toFixed(2)}M</span>
              <span className="ml-2 text-green-500 text-sm">
                +{(dashboardStats.viewsToday / 1000).toFixed(0)}K hôm nay
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
                      <td className="px-6 py-4 whitespace-nowrap">{(manga.views / 1000000).toFixed(1)}M</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            manga.status === "Đang tiến hành"
                              ? "bg-green-900 text-green-300"
                              : "bg-blue-900 text-blue-300"
                          }`}
                        >
                          {manga.status}
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
                            user.role === "Admin"
                              ? "bg-red-900 text-red-300"
                              : user.role === "Moderator"
                              ? "bg-yellow-900 text-yellow-300"
                              : "bg-gray-700 text-gray-300"
                          }`}
                        >
                          {user.role}
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