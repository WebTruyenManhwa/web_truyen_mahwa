/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, createRef } from "react";
// import Image from "next/image";
import Link from "next/link";
// import { mangaApi, genreApi } from "../services/api";
import React from "react";
import { useMangas, useRankings, useGenres } from '../services/swrApi';
import { useTheme } from '../hooks/useTheme';
import ChatIcon from '../components/chat/ChatIcon';
import ChatButton from '../components/chat/ChatButton';

interface Manga {
  id: number;
  title: string;
  coverImage?: string;
  description?: string;
  latestChapter?: number;
  latest_chapter?: {
    number: number;
    title?: string;
  };
  view_count?: number;
  period_views?: number;
  chapter?: number;
  updatedAt?: string;
  slug?: string;
}

interface Genre {
  id: number;
  name: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("latest");
  const [activeRanking, setActiveRanking] = useState<'day' | 'week' | 'month'>('day');
  const [showAllRows, setShowAllRows] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { theme } = useTheme();

  // Số truyện trên mỗi dòng và số dòng hiển thị ban đầu
  const MANGAS_PER_ROW = 8;
  const INITIAL_VISIBLE_ROWS = 3;
  const MAX_ROWS_BEFORE_PAGINATION = 9;

  // Sử dụng SWR hooks
  const { data: popularData, error: popularError, isLoading: popularLoading } = useMangas({
    sort: 'popularity',
    limit: 100 // Tăng giới hạn để có nhiều dữ liệu hơn
  });

  const { data: latestData, error: latestError, isLoading: latestLoading } = useMangas({
    sort: 'updatedAt',
    limit: 20
  });

  const { data: genresData } = useGenres();

  const { data: dayRankings } = useRankings('day', 6);
  const { data: weekRankings } = useRankings('week', 6);
  const { data: monthRankings } = useRankings('month', 6);

  // Xử lý dữ liệu
  const popularMangas = popularData?.mangas?.map((m: any) => ({
    ...m,
    coverImage: m.cover_image?.url || "/placeholder-manga.jpg"
  })) || [];

  const latestUpdates = latestData?.mangas?.map((m: any) => ({
    ...m,
    coverImage: m.cover_image?.url || "/placeholder-manga.jpg"
  })) || [];

  const featuredManga = popularMangas.length > 0 ? {
    ...popularMangas[0],
    coverImage: popularMangas[0].cover_image?.url || "/placeholder-manga.jpg",
  } : null;

  const genres: Genre[] = genresData || [];

  // Xử lý rankings - đảm bảo có coverImage
  const processedRankings = {
    day: dayRankings?.mangas?.map((m: any) => ({
      ...m,
      // Xử lý cả hai trường hợp: cover_image.url hoặc cover_image_url
      coverImage: m.cover_image?.url || m.cover_image_url || "/placeholder-manga.jpg"
    })) || [],
    week: weekRankings?.mangas?.map((m: any) => ({
      ...m,
      coverImage: m.cover_image?.url || m.cover_image_url || "/placeholder-manga.jpg"
    })) || [],
    month: monthRankings?.mangas?.map((m: any) => ({
      ...m,
      coverImage: m.cover_image?.url || m.cover_image_url || "/placeholder-manga.jpg"
    })) || []
  };

  // Tính toán phân trang cho Popular Manga
  const totalPopularMangas = popularMangas.length;
  const totalRows = Math.ceil(totalPopularMangas / MANGAS_PER_ROW);
  const totalPages = Math.ceil(totalRows / MAX_ROWS_BEFORE_PAGINATION);
  
  // Xác định số dòng hiển thị dựa trên trạng thái hiện tại
  const visibleRows = showAllRows 
    ? Math.min(MAX_ROWS_BEFORE_PAGINATION, totalRows) 
    : Math.min(INITIAL_VISIBLE_ROWS, totalRows);
  
  // Tính toán manga hiển thị dựa trên trang hiện tại
  const startRowIndex = (currentPage - 1) * MAX_ROWS_BEFORE_PAGINATION;
  const endRowIndex = Math.min(startRowIndex + visibleRows, totalRows);
  const startMangaIndex = startRowIndex * MANGAS_PER_ROW;
  const endMangaIndex = Math.min(endRowIndex * MANGAS_PER_ROW, totalPopularMangas);
  
  // Manga hiển thị trong trang hiện tại
  const visiblePopularMangas = popularMangas.slice(startMangaIndex, endMangaIndex);
  
  // Chia manga thành các dòng
  const popularMangaRows = [];
  for (let i = 0; i < visibleRows; i++) {
    const startIdx = i * MANGAS_PER_ROW;
    const endIdx = Math.min(startIdx + MANGAS_PER_ROW, visiblePopularMangas.length);
    popularMangaRows.push(visiblePopularMangas.slice(startIdx, endIdx));
  }

  // Danh sách thể loại mặc định (fallback)
  const defaultGenres = [
    { id: 1, name: "Action" },
    { id: 2, name: "Adventure" },
    { id: 3, name: "Comedy" },
    { id: 4, name: "Drama" },
    { id: 5, name: "Fantasy" },
    { id: 6, name: "Horror" },
    { id: 7, name: "Mystery" },
    { id: 8, name: "Romance" },
    { id: 9, name: "Sci-Fi" },
    { id: 10, name: "Slice of Life" },
    { id: 11, name: "Sports" },
    { id: 12, name: "Supernatural" },
    { id: 13, name: "Hentai" },
    { id: 14, name: "Ecchi" },
    { id: 15, name: "School Life" },
    { id: 16, name: "Shounen" },
    { id: 17, name: "Shoujo" },
    { id: 18, name: "Shounen Ai" },
    { id: 19, name: "Shoujo Ai" }
  ];

  // Tạo refs cho các dòng trong tab Latest
  const latestRowCount = Math.ceil(latestUpdates.length / MANGAS_PER_ROW);
  const latestRowRefs = React.useMemo(() => 
    Array.from({ length: latestRowCount }).map(() => createRef<HTMLDivElement>()),
  [latestRowCount]);
  
  // Theo dõi hướng scroll của mỗi dòng (true = right, false = left)
  const [rowScrollDirections, setRowScrollDirections] = React.useState<boolean[]>([]);
  
  // Khởi tạo hướng scroll cho mỗi dòng
  React.useEffect(() => {
    setRowScrollDirections(Array(latestRowCount).fill(true));
  }, [latestRowCount]);

  // Hàm scroll cho các dòng trong tab Latest
  const scrollRowLeft = (index: number) => {
    if (latestRowRefs[index]?.current) {
      latestRowRefs[index].current?.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRowRight = (index: number) => {
    if (latestRowRefs[index]?.current) {
      latestRowRefs[index].current?.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };
  
  // Kiểm tra xem có thể scroll tiếp theo hướng hiện tại không
  const canScrollMore = (element: HTMLDivElement, isRight: boolean): boolean => {
    if (isRight) {
      // Kiểm tra xem có thể scroll right thêm không
      return element.scrollLeft + element.clientWidth < element.scrollWidth - 10;
    } else {
      // Kiểm tra xem có thể scroll left thêm không
      return element.scrollLeft > 10;
    }
  };

  // Thiết lập auto scroll cho mỗi dòng
  React.useEffect(() => {
    if (activeTab !== "latest" || latestUpdates.length === 0) return;

    const intervals: NodeJS.Timeout[] = [];

    latestRowRefs.forEach((ref, index) => {
      if (!ref.current) return;

      const interval = setInterval(() => {
        const element = ref.current;
        if (!element) return;

        // Lấy hướng scroll hiện tại của dòng này
        const isScrollingRight = rowScrollDirections[index] || true; // Mặc định là scroll right nếu undefined

        // Kiểm tra xem có thể scroll tiếp theo hướng hiện tại không
        if (canScrollMore(element, isScrollingRight)) {
          // Tiếp tục scroll theo hướng hiện tại
          if (isScrollingRight) {
            scrollRowRight(index);
          } else {
            scrollRowLeft(index);
          }
        } else {
          // Đổi hướng scroll
          const newDirections = [...rowScrollDirections];
          newDirections[index] = !isScrollingRight;
          setRowScrollDirections(newDirections);

          // Scroll theo hướng mới
          if (!isScrollingRight) {
            scrollRowRight(index);
          } else {
            scrollRowLeft(index);
          }
        }
      }, 5000); // 5 giây

      intervals.push(interval);
    });

    // Cleanup khi component unmount hoặc activeTab thay đổi
    return () => {
      intervals.forEach(interval => clearInterval(interval));
    };
  }, [activeTab, latestUpdates.length, latestRowRefs.length, rowScrollDirections]);

  // Hàm xử lý phân trang
  const goToPage = (page: number) => {
    setCurrentPage(page);
    setShowAllRows(false); // Reset trạng thái hiển thị khi chuyển trang
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Kiểm tra trạng thái loading
  const isLoading = popularLoading || latestLoading;
  const error = popularError || latestError;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && !featuredManga) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500 mb-4">Không thể tải dữ liệu. Vui lòng thử lại sau.</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      {/* Hero Banner - Enhanced with better overlay and styling */}
      {featuredManga && (
        <section className="relative rounded-lg overflow-hidden">
          <div className="relative h-80 md:h-[450px]">
            <img
              src={featuredManga.coverImage || "https://placehold.co/1200x800/333/white?text=No+Image"}
              alt={featuredManga.title}
              className="w-full h-full object-cover brightness-75"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full md:max-w-3xl backdrop-blur-sm bg-black/30 rounded-tr-lg">
              <h1 className="text-3xl md:text-4xl font-bold mb-3 text-white drop-shadow-md font-nunito">{featuredManga.title}</h1>
              <p className="text-gray-200 mb-5 line-clamp-3 text-sm md:text-base drop-shadow">{featuredManga.description}</p>
              <Link
                href={`/manga/${featuredManga.slug || featuredManga.id}`}
                className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white px-6 py-3 rounded-md font-medium text-sm inline-block transition-all duration-300 hover:scale-105 hover:shadow-lg animate-pulse-slow"
              >
                Đọc ngay
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Tab Navigation */}
      <div className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} mb-4`}>
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab("latest")}
            className={`py-2 px-4 font-medium text-lg ${
              activeTab === "latest"
                ? "text-red-500 border-b-2 border-red-500"
                : theme === 'dark' ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Mới cập nhật
          </button>
          <button
            onClick={() => setActiveTab("popular")}
            className={`py-2 px-4 font-medium text-lg ${
              activeTab === "popular"
                ? "text-red-500 border-b-2 border-red-500"
                : theme === 'dark' ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Phổ biến
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Manga List for Latest Updates */}
      {activeTab === "latest" && (
        <div className="space-y-12">
          {/* Chia truyện thành các dòng, mỗi dòng 8 truyện có thể scroll */}
          {Array.from({ length: Math.ceil(latestUpdates.length / MANGAS_PER_ROW) }).map((_, rowIndex) => {
            const rowMangas = latestUpdates.slice(rowIndex * MANGAS_PER_ROW, (rowIndex + 1) * MANGAS_PER_ROW);
            
            return (
              <div key={`latest-row-${rowIndex}`} className="relative">
                {/* Left scroll button */}
                <button 
                  onClick={() => scrollRowLeft(rowIndex)}
                  className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 ${theme === 'dark' ? 'bg-gray-900/80 hover:bg-gray-800' : 'bg-white/80 hover:bg-gray-100'} text-red-500 rounded-full p-2 shadow-lg`}
                  aria-label="Scroll left"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                {/* Scrollable container cho dòng này */}
                <div 
                  ref={latestRowRefs[rowIndex]}
                  className="flex overflow-x-auto pb-4 hide-scrollbar snap-x snap-mandatory"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {rowMangas.map((manga: Manga, index: number) => (
                    <div key={manga.id || `latest-${rowIndex}-${index}`} className="flex-shrink-0 w-[180px] sm:w-[200px] md:w-[220px] mx-2 snap-start">
                      <Link href={`/manga/${manga.slug || manga.id}`} className="block group">
                        <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-2 bg-gray-800 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl">
                          <img
                            src={manga.coverImage}
                            alt={manga.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                          {/* Chapter Badge */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-medium">
                                Chapter {manga.latest_chapter?.number || manga.latestChapter || manga.chapter || "?"}
                              </span>

                              {manga.view_count && (
                                <span className="flex items-center text-white text-xs">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-3 w-3 mr-1"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                    />
                                  </svg>
                                  {manga.view_count >= 1000000
                                    ? `${(manga.view_count / 1000000).toFixed(1)}M`
                                    : manga.view_count >= 1000
                                    ? `${(manga.view_count / 1000).toFixed(0)}K`
                                    : manga.view_count}
                                </span>
                              )}
                            </div>
                            
                            {/* Hover description */}
                            <div className="hidden group-hover:block mt-1">
                              <p className="text-white text-xs line-clamp-2 opacity-90">{manga.description || "Không có mô tả"}</p>
                            </div>
                          </div>
                        </div>
                        <h3 className="font-medium text-sm line-clamp-2 group-hover:text-red-500 transition-colors font-nunito">{manga.title}</h3>
                      </Link>
                      {manga.updatedAt && (
                        <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'} text-xs`}>
                          {new Date(manga.updatedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Right scroll button */}
                <button 
                  onClick={() => scrollRowRight(rowIndex)}
                  className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 ${theme === 'dark' ? 'bg-gray-900/80 hover:bg-gray-800' : 'bg-white/80 hover:bg-gray-100'} text-red-500 rounded-full p-2 shadow-lg`}
                  aria-label="Scroll right"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Regular Grid for Popular Manga - Modified to display in rows */}
      {activeTab === "popular" && (
        <div className="space-y-8">
          {/* Hiển thị từng dòng manga */}
          {popularMangaRows.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 md:gap-6">
              {row.map((manga: Manga, index: number) => (
                <div key={manga.id || `popular-${rowIndex}-${index}`} className="group">
                  <Link href={`/manga/${manga.slug || manga.id}`} className="block">
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-2 bg-gray-800 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl">
                      <img
                        src={manga.coverImage}
                        alt={manga.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                      {/* Chapter Badge */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-medium">
                            Chapter {manga.latest_chapter?.number || manga.latestChapter || manga.chapter || "?"}
                          </span>

                          {manga.view_count && (
                            <span className="flex items-center text-white text-xs">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3 w-3 mr-1"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                              {manga.view_count >= 1000000
                                ? `${(manga.view_count / 1000000).toFixed(1)}M`
                                : manga.view_count >= 1000
                                ? `${(manga.view_count / 1000).toFixed(0)}K`
                                : manga.view_count}
                            </span>
                          )}
                        </div>
                        
                        {/* Hover description */}
                        <div className="hidden group-hover:block mt-1">
                          <p className="text-white text-xs line-clamp-2 opacity-90">{manga.description || "Không có mô tả"}</p>
                        </div>
                      </div>
                    </div>
                    <h3 className="font-medium text-sm line-clamp-2 group-hover:text-red-500 transition-colors font-nunito">{manga.title}</h3>
                  </Link>
                  {manga.updatedAt && (
                    <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'} text-xs`}>
                      {new Date(manga.updatedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Nút Xem thêm - chỉ hiển thị khi có nhiều hơn 3 dòng và chưa hiển thị tất cả */}
          {totalRows > INITIAL_VISIBLE_ROWS && (
            <div className="text-center mt-6">
              <button
                onClick={() => setShowAllRows(!showAllRows)}
                className={`inline-block bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white px-8 py-3 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-md`}
              >
                {showAllRows ? "Thu gọn" : "Xem thêm"}
              </button>
            </div>
          )}

          {/* Phân trang - chỉ hiển thị khi có nhiều hơn MAX_ROWS_BEFORE_PAGINATION dòng */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-8">
              <button
                onClick={() => goToPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-md ${
                  currentPage === 1 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                &lt;
              </button>
              
              {/* Hiển thị các nút trang */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Tính toán số trang để hiển thị, đảm bảo trang hiện tại nằm ở giữa nếu có thể
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={`page-${pageNum}`}
                    onClick={() => goToPage(pageNum)}
                    className={`px-3 py-1 rounded-md ${
                      currentPage === pageNum
                        ? 'bg-red-500 text-white'
                        : theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              {/* Hiển thị dấu ... nếu có nhiều trang */}
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <span className="px-2">...</span>
              )}
              
              {/* Luôn hiển thị trang cuối cùng nếu có nhiều hơn 5 trang và không nằm trong 5 trang đầu tiên */}
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <button
                  onClick={() => goToPage(totalPages)}
                  className={`px-3 py-1 rounded-md ${
                    theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {totalPages}
                </button>
              )}
              
              <button
                onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded-md ${
                  currentPage === totalPages 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                &gt;
              </button>
            </div>
          )}
        </div>
      )}

      {/* View More Button - Improved style - chỉ hiển thị cho Latest */}
      {activeTab === "latest" && (
        <div className="text-center mt-8">
          <Link
            href="/latest"
            className="inline-block bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white px-8 py-3 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-md"
          >
            Xem thêm
          </Link>
        </div>
      )}

      {/* Top Rankings Section - Improved with special styling for top 3 */}
      <section className="mt-12">
        <h2 className={`text-2xl font-bold mb-4 pb-2 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} font-nunito`}>Bảng xếp hạng</h2>

        <div className={`flex mb-4 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
          <button
            className={`px-4 py-2 font-medium ${activeRanking === 'day' ? 'text-red-500 border-b-2 border-red-500' : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
            onClick={() => setActiveRanking('day')}
          >
            Top ngày
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeRanking === 'week' ? 'text-red-500 border-b-2 border-red-500' : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
            onClick={() => setActiveRanking('week')}
          >
            Top tuần
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeRanking === 'month' ? 'text-red-500 border-b-2 border-red-500' : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
            onClick={() => setActiveRanking('month')}
          >
            Top tháng
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {processedRankings[activeRanking].map((manga: { id: React.Key | null | undefined; slug: any; coverImage: any; title: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; latestChapter: any; latest_chapter?: {number: number}; chapter: any; period_views: any; view_count: any; description?: string; }, index: number) => (
            <div key={manga.id || `ranking-${activeRanking}-${index}`} className="group">
              <Link href={`/manga/${manga.slug || manga.id}`} className="block">
                <div className={`relative aspect-[2/3] rounded-lg overflow-hidden mb-2 bg-gray-800 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl ${
                  index < 3 ? `ring-2 ${index === 0 ? 'ring-yellow-500' : index === 1 ? 'ring-gray-400' : 'ring-amber-700'}` : ''
                }`}>
                  {/* Ranking number badge with special styling for top 3 */}
                  <div className={`absolute top-0 right-0 px-2 py-1 text-sm z-10 font-bold ${
                    index === 0 ? 'bg-yellow-500 text-black' : 
                    index === 1 ? 'bg-gray-300 text-black' : 
                    index === 2 ? 'bg-amber-700 text-white' : 
                    theme === 'dark' ? 'bg-gray-900/80 text-red-500' : 'bg-white/80 text-red-500'
                  }`}>
                    #{index + 1}
                  </div>
                  <img
                    src={manga.coverImage || "/placeholder-manga.jpg"}
                    alt={manga.title as string}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                  {/* Chapter Badge */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-medium">
                        Chapter {manga.latest_chapter?.number || manga.latestChapter || manga.chapter || 1}
                      </span>

                      <span className="flex items-center text-white text-xs">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3 mr-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        {(manga.period_views || manga.view_count || 0) >= 1000000
                          ? `${((manga.period_views || manga.view_count || 0) / 1000000).toFixed(1)}M`
                          : (manga.period_views || manga.view_count || 0) >= 1000
                          ? `${((manga.period_views || manga.view_count || 0) / 1000).toFixed(0)}K`
                          : manga.period_views || manga.view_count || 0}
                      </span>
                    </div>
                    
                    {/* Hover description */}
                    <div className="hidden group-hover:block mt-1">
                      <p className="text-white text-xs line-clamp-2 opacity-90">{manga.description || "Không có mô tả"}</p>
                    </div>
                  </div>
                </div>
                <h3 className="font-medium text-sm line-clamp-2 group-hover:text-red-500 transition-colors font-nunito">{manga.title}</h3>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Genres Section - Added hover effects */}
      <section className="mt-12">
        <h2 className={`text-2xl font-bold mb-4 pb-2 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} font-nunito`}>Thể loại</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Chat icon at the beginning */}
          <ChatIcon />
          
          {/* Existing genres */}
          {(genres.length > 0 ? genres : defaultGenres).map((genre: { id: React.Key | null | undefined; name: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; }, index: number) => (
            <Link
              key={genre.id || `genre-${index}`}
              href={`/genres/${String(genre.name).toLowerCase()}`}
              className={`${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'} text-center py-3 rounded-lg transition-all duration-200 hover:text-red-500 hover:scale-105 hover:shadow-md`}
            >
              {genre.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Floating Chat Button */}
      <ChatButton />

      {/* Add CSS for hiding scrollbar */}
      <style jsx global>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        
        /* Hide scrollbar for IE, Edge and Firefox */
        .hide-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>
    </div>
  );
}
