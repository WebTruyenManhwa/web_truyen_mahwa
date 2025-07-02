"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "../hooks/useAuth";
import React from "react";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, isAuthenticated, logout } = useAuth();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Trong thực tế, sẽ chuyển hướng đến trang kết quả tìm kiếm
    console.log("Searching for:", searchQuery);
    // window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
  };

  const handleLogout = () => {
    logout();
    // Không cần chuyển hướng vì AuthProvider sẽ tự động cập nhật state
  };

  return (
    <header className="bg-gray-900 border-b border-gray-800">
      {/* Top Header */}
      <div className="bg-gray-800 py-2 border-b border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-red-500">MangaVerse</span>
            </Link>
            
            <div className="flex items-center space-x-4">
              {/* Desktop Search */}
              <div className="hidden md:block relative">
                <form onSubmit={handleSearch} className="flex">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm truyện..."
                    className="w-64 bg-gray-700 text-white px-4 py-1 rounded-l-full focus:outline-none focus:ring-1 focus:ring-red-500 text-sm"
                  />
                  <button
                    type="submit"
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded-r-full"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </button>
                </form>
              </div>
              
              {/* Authentication */}
              {isAuthenticated ? (
                <div className="relative group">
                  <button className="flex items-center text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-full text-sm">
                    <span className="mr-1">{user?.username}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <div className="absolute right-0 mt-1 w-48 bg-gray-800 rounded-lg shadow-lg py-1 z-20 hidden group-hover:block border border-gray-700">
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-gray-300 hover:bg-gray-700 text-sm"
                    >
                      Trang cá nhân
                    </Link>
                    <Link
                      href="/favorites"
                      className="block px-4 py-2 text-gray-300 hover:bg-gray-700 text-sm"
                    >
                      Truyện yêu thích
                    </Link>
                    <Link
                      href="/history"
                      className="block px-4 py-2 text-gray-300 hover:bg-gray-700 text-sm"
                    >
                      Lịch sử đọc
                    </Link>
                    {user?.role === 'admin' && (
                      <Link
                        href="/admin/dashboard"
                        className="block px-4 py-2 text-gray-300 hover:bg-gray-700 text-sm"
                      >
                        Quản trị
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 text-sm"
                    >
                      Đăng xuất
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex space-x-2">
                  <Link
                    href="/auth/login"
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-full text-sm"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    href="/auth/register"
                    className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded-full text-sm"
                  >
                    Đăng ký
                  </Link>
                </div>
              )}
              
              {/* Mobile Menu Button */}
              <button
                onClick={toggleMenu}
                className="md:hidden text-gray-300 hover:text-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {isMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Navigation */}
      <div className="container mx-auto px-4">
        <nav className="hidden md:flex py-3 space-x-6">
          <Link href="/" className="text-gray-300 hover:text-red-500 font-medium">
            Trang chủ
          </Link>
          <Link href="/latest" className="text-gray-300 hover:text-red-500 font-medium">
            Mới cập nhật
          </Link>
          <Link href="/popular" className="text-gray-300 hover:text-red-500 font-medium">
            Phổ biến
          </Link>
          <Link href="/completed" className="text-gray-300 hover:text-red-500 font-medium">
            Hoàn thành
          </Link>
          <div className="relative group">
            <button className="text-gray-300 hover:text-red-500 font-medium flex items-center">
              Thể loại
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 ml-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <div className="absolute left-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg py-2 z-20 hidden group-hover:block border border-gray-700">
              <div className="grid grid-cols-2 gap-1 px-2">
                <Link href="/genres/action" className="text-gray-300 hover:text-red-500 text-sm py-1">
                  Action
                </Link>
                <Link href="/genres/adventure" className="text-gray-300 hover:text-red-500 text-sm py-1">
                  Adventure
                </Link>
                <Link href="/genres/comedy" className="text-gray-300 hover:text-red-500 text-sm py-1">
                  Comedy
                </Link>
                <Link href="/genres/drama" className="text-gray-300 hover:text-red-500 text-sm py-1">
                  Drama
                </Link>
                <Link href="/genres/fantasy" className="text-gray-300 hover:text-red-500 text-sm py-1">
                  Fantasy
                </Link>
                <Link href="/genres/horror" className="text-gray-300 hover:text-red-500 text-sm py-1">
                  Horror
                </Link>
              </div>
              <div className="border-t border-gray-700 mt-2 pt-2 px-2">
                <Link href="/genres" className="text-red-500 hover:underline text-sm">
                  Xem tất cả thể loại
                </Link>
              </div>
            </div>
          </div>
        </nav>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden py-4 border-t border-gray-800 bg-gray-900">
          <div className="container mx-auto px-4">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="mb-4 flex">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm truyện..."
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-l focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-r"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            </form>
            
            <nav className="flex flex-col space-y-3">
              <Link
                href="/"
                className="text-gray-300 hover:text-red-500"
                onClick={() => setIsMenuOpen(false)}
              >
                Trang chủ
              </Link>
              <Link
                href="/latest"
                className="text-gray-300 hover:text-red-500"
                onClick={() => setIsMenuOpen(false)}
              >
                Mới cập nhật
              </Link>
              <Link
                href="/popular"
                className="text-gray-300 hover:text-red-500"
                onClick={() => setIsMenuOpen(false)}
              >
                Phổ biến
              </Link>
              <Link
                href="/completed"
                className="text-gray-300 hover:text-red-500"
                onClick={() => setIsMenuOpen(false)}
              >
                Hoàn thành
              </Link>
              <Link
                href="/genres"
                className="text-gray-300 hover:text-red-500"
                onClick={() => setIsMenuOpen(false)}
              >
                Thể loại
              </Link>
              
              <div className="border-t border-gray-800 pt-3 mt-3">
              {isAuthenticated ? (
                <div
                  className="relative"
                  onMouseEnter={() => setIsDropdownOpen(true)}
                  onMouseLeave={() => setIsDropdownOpen(false)}
                >
                  <button className="flex items-center text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-full text-sm">
                    <span className="mr-1">{user?.username}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-1 w-48 bg-gray-800 rounded-lg shadow-lg py-1 z-20 border border-gray-700">
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-gray-300 hover:bg-gray-700 text-sm"
                      >
                        Trang cá nhân
                      </Link>
                      <Link
                        href="/favorites"
                        className="block px-4 py-2 text-gray-300 hover:bg-gray-700 text-sm"
                      >
                        Truyện yêu thích
                      </Link>
                      <Link
                        href="/history"
                        className="block px-4 py-2 text-gray-300 hover:bg-gray-700 text-sm"
                      >
                        Lịch sử đọc
                      </Link>
                      {user?.role === 'admin' && (
                        <Link
                          href="/admin/dashboard"
                          className="block px-4 py-2 text-gray-300 hover:bg-gray-700 text-sm"
                        >
                          Quản trị
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 text-sm"
                      >
                        Đăng xuất
                      </button>
                    </div>
                  )}
                </div>
                ) : (
                  <div className="flex flex-col space-y-2">
                    <Link
                      href="/auth/login"
                      className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded text-center"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Đăng nhập
                    </Link>
                    <Link
                      href="/auth/register"
                      className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded text-center"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Đăng ký
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}