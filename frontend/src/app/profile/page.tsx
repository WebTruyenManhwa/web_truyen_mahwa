"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, updateUser } = useAuth();
  const router = useRouter();
  
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    // Nếu không đăng nhập, chuyển hướng về trang đăng nhập
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login");
    }
    
    // Điền thông tin người dùng hiện tại vào form
    if (user) {
      setDisplayName(user.username || "");
      setEmail(user.email || "");
    }
  }, [user, isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    
    // Kiểm tra mật khẩu mới khớp nhau
    if (newPassword && newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const updateData: {
        username?: string;
        email?: string;
        password?: string;
        current_password?: string;
      } = {};
      
      // Chỉ cập nhật các trường có thay đổi
      if (displayName !== user?.username) {
        updateData.username = displayName;
      }
      
      if (email !== user?.email) {
        updateData.email = email;
      }
      
      if (newPassword) {
        updateData.password = newPassword;
        updateData.current_password = currentPassword;
      }
      
      // Chỉ gọi API nếu có dữ liệu cần cập nhật
      if (Object.keys(updateData).length > 0) {
        await updateUser(updateData);
        setSuccessMessage("Cập nhật thông tin thành công");
        
        // Xóa mật khẩu sau khi cập nhật
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Có lỗi xảy ra khi cập nhật thông tin");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Cài Đặt</h1>
        
        <div className="bg-gray-800 rounded-lg shadow-lg p-6">
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-100 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}
          
          {successMessage && (
            <div className="bg-green-900/50 border border-green-500 text-green-100 px-4 py-3 rounded-lg mb-6">
              {successMessage}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Thay đổi tên hiển thị */}
            <div>
              <h2 className="text-lg font-medium mb-4">Thay đổi tên hiển thị</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="current-name" className="block text-sm font-medium mb-1">
                    Tên hiển thị hiện tại
                  </label>
                  <input
                    type="text"
                    id="current-name"
                    value={user?.username || ""}
                    disabled
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 opacity-70"
                  />
                </div>
                
                <div>
                  <label htmlFor="new-name" className="block text-sm font-medium mb-1">
                    Tên hiển thị mới
                  </label>
                  <input
                    type="text"
                    id="new-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập tên hiển thị mới"
                  />
                </div>
              </div>
            </div>
            
            {/* Thay đổi email */}
            <div className="pt-6 border-t border-gray-700">
              <h2 className="text-lg font-medium mb-4">Thay đổi địa chỉ email</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="current-email" className="block text-sm font-medium mb-1">
                    Email hiện tại
                  </label>
                  <input
                    type="email"
                    id="current-email"
                    value={user?.email || ""}
                    disabled
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 opacity-70"
                  />
                </div>
                
                <div>
                  <label htmlFor="new-email" className="block text-sm font-medium mb-1">
                    Email mới
                  </label>
                  <input
                    type="email"
                    id="new-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập email mới"
                  />
                </div>
              </div>
            </div>
            
            {/* Thay đổi mật khẩu */}
            <div className="pt-6 border-t border-gray-700">
              <h2 className="text-lg font-medium mb-4">Thay đổi mật khẩu</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="current-password" className="block text-sm font-medium mb-1">
                    Mật khẩu hiện tại
                  </label>
                  <input
                    type="password"
                    id="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                </div>
                
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium mb-1">
                    Mật khẩu mới
                  </label>
                  <input
                    type="password"
                    id="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                </div>
                
                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium mb-1">
                    Xác nhận mật khẩu
                  </label>
                  <input
                    type="password"
                    id="confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>
            
            <div className="pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg font-medium flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Đang xử lý...
                  </>
                ) : (
                  "Lưu thay đổi"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 