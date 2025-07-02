"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import axios from 'axios';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const error = searchParams.get("error");
  
  useEffect(() => {
    if (token) {
      // Lưu token vào localStorage
      localStorage.setItem("token", token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      // Lấy thông tin user từ token (JWT)
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const user = JSON.parse(jsonPayload);
        localStorage.setItem("user", JSON.stringify(user));
        
        // Chuyển hướng về trang chủ
        router.push("/");
      } catch (error) {
        console.error("Failed to parse token:", error);
        router.push("/auth/login?error=Đăng nhập thất bại");
      }
    } else if (error) {
      // Chuyển hướng về trang đăng nhập với thông báo lỗi
      router.push(`/auth/login?error=${error}`);
    } else {
      // Không có token hoặc lỗi, chuyển về trang đăng nhập
      router.push("/auth/login");
    }
  }, [token, error, router]);
  
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
} 