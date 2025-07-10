"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../../hooks/useAuth";
// import axios from 'axios';
import React from "react";

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const error = searchParams.get("error");
  const { loginWithToken } = useAuth();
  const hasHandled = useRef(false);

  useEffect(() => {
    if (hasHandled.current) return;
    hasHandled.current = true;
    const handleLogin = async () => {
    if (token) {

      try {
        await loginWithToken(token);
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
  };

  handleLogin();
  }, [token, error, loginWithToken, router]);
  
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
} 