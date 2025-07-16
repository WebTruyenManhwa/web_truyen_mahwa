"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { mangaApi } from "../services/api";
import React from "react";

interface SearchResult {
  id: number;
  title: string;
  slug?: string;
  cover_image?: { url: string };
  latest_chapter?: { number: number; created_at: string };
}

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const searchRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const searchTimer = setTimeout(() => {
      if (searchQuery.trim().length >= 1) {
        performSearch();
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [searchQuery]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      let openTimeoutId: NodeJS.Timeout;
      let closeTimeoutId: NodeJS.Timeout;

      const handleMouseEnter = () => {
        clearTimeout(closeTimeoutId);
        openTimeoutId = setTimeout(() => {
          setIsDropdownOpen(true);
        }, 0);
      };

      const handleMouseLeave = () => {
        clearTimeout(openTimeoutId);
        closeTimeoutId = setTimeout(() => {
          setIsDropdownOpen(false);
        }, 300);
      };

      const dropdownElement = dropdownRef.current;
      if (dropdownElement) {
        dropdownElement.addEventListener('mouseenter', handleMouseEnter);
        dropdownElement.addEventListener('mouseleave', handleMouseLeave);
      }

      // Cleanup
      return () => {
        clearTimeout(openTimeoutId);
        clearTimeout(closeTimeoutId);
        if (dropdownElement) {
          dropdownElement.removeEventListener('mouseenter', handleMouseEnter);
          dropdownElement.removeEventListener('mouseleave', handleMouseLeave);
        }
      };
    }, 2500); // ⏳ Delay 1.5s

    // Cleanup timeout if component unmounts early
    return () => clearTimeout(timeout);
  }, []);

  // Add new useEffect to handle category dropdown menu behavior
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleMouseEnter = () => {
      clearTimeout(timeoutId);
      setIsCategoryDropdownOpen(true);
    };

    const handleMouseLeave = () => {
      timeoutId = setTimeout(() => {
        setIsCategoryDropdownOpen(false);
      }, 300); // 300ms delay before hiding the dropdown
    };

    const categoryDropdownElement = categoryDropdownRef.current;
    if (categoryDropdownElement) {
      categoryDropdownElement.addEventListener('mouseenter', handleMouseEnter);
      categoryDropdownElement.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      clearTimeout(timeoutId);
      if (categoryDropdownElement) {
        categoryDropdownElement.removeEventListener('mouseenter', handleMouseEnter);
        categoryDropdownElement.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  const performSearch = async () => {
    if (searchQuery.trim().length < 1) return;

    setIsSearching(true);
    try {
      const response = await mangaApi.getMangas({ search: searchQuery, limit: 5 });
      console.log("Search results:", response); // Debug log to check response structure

      // Fix: Access the correct property from the API response and ensure latest_chapter is available
      const results = response.mangas || [];

      // Map the results to ensure consistent structure
      const formattedResults = results.map(manga => ({
        id: manga.id,
        title: manga.title,
        slug: manga.slug,
        cover_image: manga.cover_image,
        latest_chapter: manga.latest_chapter || null
      }));

      setSearchResults(formattedResults);
      setShowSearchResults(true);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 24) {
      return `${diffHours} giờ trước`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} ngày trước`;
    }
  };

  const handleLogout = () => {
    logout();
  };

  const renderUserDropdown = () => {
    if (!isAuthenticated) {
      return (
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
      );
    }

    return (
      <div
        className="relative"
        ref={dropdownRef}
      >
        <button
          className="flex items-center text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-full text-sm"
          onMouseEnter={() => setIsDropdownOpen(true)}
        >
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
    );
  };

  // Replace the category dropdown section with this updated version
  const renderCategoryDropdown = () => {
    return (
      <div className="relative" ref={categoryDropdownRef}>
        <button
          className={`${theme === 'dark' ? 'text-gray-300 hover:text-red-500' : 'text-gray-700 hover:text-red-500'} font-medium flex items-center`}
          onMouseEnter={() => setIsCategoryDropdownOpen(true)}
        >
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
        {isCategoryDropdownOpen && (
          <div className="absolute left-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg py-2 z-20 border border-gray-700">
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
        )}
                </div>
    );
  };

  // Theme toggle button
  const renderThemeToggle = () => {
    return (
      <button
        onClick={toggleTheme}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? (
          // Sun icon for dark mode (switch to light)
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-300" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
          </svg>
        ) : (
          // Moon icon for light mode (switch to dark)
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        )}
      </button>
    );
  };

  return (
    <header className={`${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
      {/* Top Header */}
      <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} py-2 border-b`}>
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-red-500 font-nunito">MangaVerse</span>
            </Link>

            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <div className="mr-2">
                {renderThemeToggle()}
              </div>

              {/* Desktop Search */}
              <div ref={searchRef} className="hidden md:block relative">
                <form onSubmit={handleSearch} className="flex">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (searchResults.length > 0) {
                        setShowSearchResults(true);
                      }
                    }}
                    placeholder="Tìm kiếm truyện..."
                    className={`w-64 ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'} px-4 py-1 rounded-l-full focus:outline-none focus:ring-1 focus:ring-red-500 text-sm`}
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

                {/* Search Results Dropdown */}
                {showSearchResults && (
                  <div className={`absolute left-0 right-0 mt-1 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-lg overflow-hidden z-50 border`}>
                    {isSearching ? (
                      <div className={`p-3 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-red-500 mr-2"></div>
                        Đang tìm kiếm...
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div>
                        <div className={`${searchResults.length > 5 ? 'max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800' : ''}`}>
                          {searchResults.map((manga) => (
                            <Link
                              href={`/manga/${manga.slug || manga.id}`}
                              key={manga.id}
                              onClick={() => setShowSearchResults(false)}
                              className={`flex items-center p-2 ${theme === 'dark' ? 'hover:bg-gray-700 border-gray-700' : 'hover:bg-gray-100 border-gray-200'} border-b last:border-b-0`}
                            >
                              <div className="w-10 h-14 flex-shrink-0 mr-3 overflow-hidden rounded">
                                <img
                                  src={manga.cover_image?.url || "/placeholder-manga.jpg"}
                                  alt={manga.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} text-sm font-medium truncate`}>{manga.title}</p>
                                {manga.latest_chapter ? (
                                  <div className="flex justify-between text-xs text-gray-400">
                                    <span className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} px-2 py-1 rounded`}>Chapter {manga.latest_chapter.number}</span>
                                    <span>{formatTimeAgo(manga.latest_chapter.created_at)}</span>
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-400">
                                    <span>Chưa có chapter</span>
                                  </div>
                                )}
                              </div>
                  </Link>
                          ))}
                        </div>
                        <div className={`p-2 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <Link
                            href={`/search?q=${encodeURIComponent(searchQuery)}`}
                            onClick={() => setShowSearchResults(false)}
                            className="text-red-500 text-xs hover:underline block text-center"
                  >
                            Xem tất cả kết quả
                  </Link>
                        </div>
                      </div>
                    ) : (
                      <div className={`p-3 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-sm`}>
                        Không tìm thấy truyện nào
                      </div>
                    )}
                </div>
              )}
              </div>

              {/* Authentication */}
              {renderUserDropdown()}

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
          <Link href="/" className={`${theme === 'dark' ? 'text-gray-300 hover:text-red-500' : 'text-gray-700 hover:text-red-500'} font-medium`}>
            Trang chủ
          </Link>
          <Link href="/latest" className={`${theme === 'dark' ? 'text-gray-300 hover:text-red-500' : 'text-gray-700 hover:text-red-500'} font-medium`}>
            Mới cập nhật
          </Link>
          <Link href="/popular" className={`${theme === 'dark' ? 'text-gray-300 hover:text-red-500' : 'text-gray-700 hover:text-red-500'} font-medium`}>
            Phổ biến
          </Link>
          <Link href="/completed" className={`${theme === 'dark' ? 'text-gray-300 hover:text-red-500' : 'text-gray-700 hover:text-red-500'} font-medium`}>
            Hoàn thành
          </Link>
          <Link href="/novel-series" className={`${theme === 'dark' ? 'text-gray-300 hover:text-red-500' : 'text-gray-700 hover:text-red-500'} font-medium`}>
            Truyện chữ
          </Link>
          {renderCategoryDropdown()}
        </nav>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className={`md:hidden py-4 border-t ${theme === 'dark' ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
          <div className="container mx-auto px-4">
            {/* Mobile Search */}
            <div ref={searchRef} className="relative mb-4">
              <form onSubmit={handleSearch} className="flex">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) {
                      setShowSearchResults(true);
                    }
                  }}
                placeholder="Tìm kiếm truyện..."
                className={`flex-1 ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'} px-4 py-2 rounded-l-lg focus:outline-none focus:ring-1 focus:ring-red-500`}
              />
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-r-lg"
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

            {/* Mobile Search Results Dropdown */}
            {showSearchResults && (
              <div className={`absolute left-0 right-0 mt-1 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-lg overflow-hidden z-50 border`}>
                {isSearching ? (
                  <div className={`p-3 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-red-500 mr-2"></div>
                    Đang tìm kiếm...
                  </div>
                ) : searchResults.length > 0 ? (
                  <div>
                    <div className={`${searchResults.length > 5 ? 'max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800' : ''}`}>
                      {searchResults.map((manga) => (
                        <Link
                          href={`/manga/${manga.slug || manga.id}`}
                          key={manga.id}
                          onClick={() => setShowSearchResults(false)}
                          className={`flex items-center p-2 ${theme === 'dark' ? 'hover:bg-gray-700 border-gray-700' : 'hover:bg-gray-100 border-gray-200'} border-b last:border-b-0`}
                        >
                          <div className="w-10 h-14 flex-shrink-0 mr-3 overflow-hidden rounded">
                            <img
                              src={manga.cover_image?.url || "/placeholder-manga.jpg"}
                              alt={manga.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} text-sm font-medium truncate`}>{manga.title}</p>
                            {manga.latest_chapter ? (
                              <div className="flex justify-between text-xs text-gray-400">
                                <span className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} px-2 py-1 rounded`}>Chapter {manga.latest_chapter.number}</span>
                                <span>{formatTimeAgo(manga.latest_chapter.created_at)}</span>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400">
                                <span>Chưa có chapter</span>
                              </div>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                    <div className={`p-2 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                      <Link
                        href={`/search?q=${encodeURIComponent(searchQuery)}`}
                        onClick={() => setShowSearchResults(false)}
                        className="text-red-500 text-xs hover:underline block text-center"
                      >
                        Xem tất cả kết quả
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className={`p-3 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-sm`}>
                    Không tìm thấy truyện nào
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Navigation Links */}
          <div className="flex flex-col space-y-3">
            <Link href="/" className={`${theme === 'dark' ? 'text-gray-300 hover:text-red-500' : 'text-gray-700 hover:text-red-500'} font-medium`}>
              Trang chủ
            </Link>
            <Link href="/latest" className={`${theme === 'dark' ? 'text-gray-300 hover:text-red-500' : 'text-gray-700 hover:text-red-500'} font-medium`}>
              Mới cập nhật
            </Link>
            <Link href="/popular" className={`${theme === 'dark' ? 'text-gray-300 hover:text-red-500' : 'text-gray-700 hover:text-red-500'} font-medium`}>
              Phổ biến
            </Link>
            <Link href="/completed" className={`${theme === 'dark' ? 'text-gray-300 hover:text-red-500' : 'text-gray-700 hover:text-red-500'} font-medium`}>
              Hoàn thành
            </Link>
            <Link href="/novel-series" className={`${theme === 'dark' ? 'text-gray-300 hover:text-red-500' : 'text-gray-700 hover:text-red-500'} font-medium`}>
              Truyện chữ
            </Link>
            <Link href="/genres" className={`${theme === 'dark' ? 'text-gray-300 hover:text-red-500' : 'text-gray-700 hover:text-red-500'} font-medium`}>
              Thể loại
            </Link>
          </div>
        </div>
      </div>
    )}
  </header>
  );
}
