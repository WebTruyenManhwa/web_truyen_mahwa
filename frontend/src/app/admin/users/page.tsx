"use client";

import { useState, useEffect, useCallback } from "react";
import { adminApi } from "../../../services/api";
import AdminSidebar from "../../../components/admin/AdminSidebar";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  created_at: string;
  can_be_deleted: boolean;
  can_change_role: boolean;
}

interface UsersResponse {
  users: User[];
  pagination: {
    current_page: number;
    next_page: number | null;
    prev_page: number | null;
    total_pages: number;
    total_count: number;
  };
}

// Add error interface
interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
  message: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params: { page: number; limit: number; search?: string } = {
        page,
        limit: 10,
      };

      if (search) {
        params.search = search;
      }

      const response = await adminApi.getUsers(params);
      const data = response as UsersResponse;

      setUsers(data.users);
      setPagination({
        currentPage: data.pagination.current_page,
        totalPages: data.pagination.total_pages,
        totalCount: data.pagination.total_count,
      });
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Không thể tải danh sách người dùng. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1);
  };

  const handlePageChange = (page: number) => {
    fetchUsers(page);
  };

  const handleRoleChange = async () => {
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      setActionError(null);
      setActionSuccess(null);

      const response = await adminApi.updateUserRole(selectedUser.id, newRole);

      // Cập nhật danh sách users
      setUsers(users.map(user =>
        user.id === selectedUser.id
          ? { ...user, role: newRole, can_be_deleted: response.user.can_be_deleted, can_change_role: response.user.can_change_role }
          : user
      ));

      setActionSuccess(`Đã thay đổi vai trò của ${selectedUser.username} thành ${newRole}`);
      setTimeout(() => setShowRoleModal(false), 1500);
    } catch (err) {
      console.error("Error updating user role:", err);
      const error = err as ApiError;
      setActionError(error.response?.data?.error || "Không thể cập nhật vai trò. Vui lòng thử lại sau.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      setActionError(null);
      setActionSuccess(null);

      await adminApi.deleteUser(selectedUser.id);

      // Xóa user khỏi danh sách
      setUsers(users.filter(user => user.id !== selectedUser.id));

      setActionSuccess(`Đã xóa người dùng ${selectedUser.username}`);
      setTimeout(() => setShowDeleteModal(false), 1500);
    } catch (err) {
      console.error("Error deleting user:", err);
      const error = err as ApiError;
      setActionError(error.response?.data?.error || "Không thể xóa người dùng. Vui lòng thử lại sau.");
    } finally {
      setActionLoading(false);
    }
  };

  const openRoleModal = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setShowRoleModal(true);
    setActionError(null);
    setActionSuccess(null);
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
    setActionError(null);
    setActionSuccess(null);
  };

  // Format role từ enum sang text
  const formatRole = (role: string) => {
    switch (role) {
      case "super_admin":
        return "Super Admin";
      case "admin":
        return "Admin";
      case "user":
        return "User";
      default:
        return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  // Render role badge với màu sắc tương ứng
  const renderRoleBadge = (role: string) => {
    let bgColor = "bg-gray-700 text-gray-300";

    if (role === "super_admin") {
      bgColor = "bg-purple-900 text-purple-300";
    } else if (role === "admin") {
      bgColor = "bg-red-900 text-red-300";
    }

    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bgColor}`}>
        {formatRole(role)}
      </span>
    );
  };

  // Hiển thị trạng thái loading
  if (loading && users.length === 0) {
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
  if (error && users.length === 0) {
    return (
      <div className="flex min-h-screen bg-gray-900">
        <AdminSidebar />
        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="bg-red-900 text-red-200 p-4 rounded-lg mb-4">
              <p>{error}</p>
            </div>
            <button
              onClick={() => fetchUsers()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Thử lại
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-900">
      <AdminSidebar />

      <main className="flex-1 p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Quản lý người dùng</h1>
          <p className="text-gray-400">Quản lý tất cả người dùng trong hệ thống</p>
        </div>

        {/* Search and filters */}
        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm theo tên hoặc email..."
              className="bg-gray-800 text-white px-4 py-2 rounded-lg flex-grow"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Tìm kiếm
            </button>
          </form>
        </div>

        {/* Users table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-700">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    ID
                  </th>
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
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderRoleBadge(user.role)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {user.can_change_role && (
                        <button
                          onClick={() => openRoleModal(user)}
                          className="text-blue-500 hover:text-blue-400 mr-4"
                        >
                          Đổi vai trò
                        </button>
                      )}
                      {user.can_be_deleted && (
                        <button
                          onClick={() => openDeleteModal(user)}
                          className="text-red-500 hover:text-red-400"
                        >
                          Xóa
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <nav className="flex items-center">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className={`px-3 py-1 rounded-l-md ${
                  pagination.currentPage === 1
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                Trước
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-1 ${
                    page === pagination.currentPage
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className={`px-3 py-1 rounded-r-md ${
                  pagination.currentPage === pagination.totalPages
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                Sau
              </button>
            </nav>
          </div>
        )}

        {/* Role change modal */}
        {showRoleModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Thay đổi vai trò</h2>
              <p className="mb-4">
                Bạn đang thay đổi vai trò của người dùng <strong>{selectedUser.username}</strong>
              </p>

              {actionSuccess && (
                <div className="bg-green-900 text-green-200 p-3 rounded-md mb-4">
                  {actionSuccess}
                </div>
              )}

              {actionError && (
                <div className="bg-red-900 text-red-200 p-3 rounded-md mb-4">
                  {actionError}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-gray-400 mb-2">Vai trò mới:</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="bg-gray-700 text-white px-3 py-2 rounded w-full"
                  disabled={actionLoading}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
                  disabled={actionLoading}
                >
                  Hủy
                </button>
                <button
                  onClick={handleRoleChange}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Đang xử lý...
                    </>
                  ) : (
                    "Lưu thay đổi"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation modal */}
        {showDeleteModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Xác nhận xóa người dùng</h2>
              <p className="mb-4">
                Bạn có chắc chắn muốn xóa người dùng <strong>{selectedUser.username}</strong>? Hành động này không thể hoàn tác.
              </p>

              {actionSuccess && (
                <div className="bg-green-900 text-green-200 p-3 rounded-md mb-4">
                  {actionSuccess}
                </div>
              )}

              {actionError && (
                <div className="bg-red-900 text-red-200 p-3 rounded-md mb-4">
                  {actionError}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
                  disabled={actionLoading}
                >
                  Hủy
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Đang xử lý...
                    </>
                  ) : (
                    "Xóa người dùng"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
