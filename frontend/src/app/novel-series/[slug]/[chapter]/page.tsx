"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import axios from "axios";
import { useParams } from "next/navigation";
import React from "react";
import { useTheme } from "../../../../hooks/useTheme";
import ThemeToggle from "../../../../components/ThemeToggle";

interface NovelSeries {
  id: number;
  title: string;
  slug: string;
}

interface NovelChapter {
  id: number;
  title: string;
  content: string;
  chapter_number: number;
  slug: string;
  created_at: string;
  updated_at: string;
}

interface ApiResponse {
  novel_chapter: NovelChapter;
  novel_series: NovelSeries;
  navigation: {
    prev_chapter: NovelChapter | null;
    next_chapter: NovelChapter | null;
  };
}

// Ngưỡng để quyết định có chia nội dung thành các phần hay không
const CONTENT_THRESHOLDS = {
  CHARACTERS: 3000, // Số ký tự
  PARAGRAPHS: 15,   // Số đoạn văn
  HEIGHT: 3000,     // Chiều cao (px)
  WORDS: 500        // Số từ
};

// Số phần hiển thị ban đầu
const INITIAL_SECTIONS_TO_SHOW = 2;

export default function NovelChapterPage() {
  const { theme } = useTheme();
  const params = useParams();
  const seriesSlug = params.slug as string;
  const chapterSlug = params.chapter as string;
  const [chapter, setChapter] = useState<NovelChapter | null>(null);
  const [series, setSeries] = useState<NovelSeries | null>(null);
  const [prevChapter, setPrevChapter] = useState<NovelChapter | null>(null);
  const [nextChapter, setNextChapter] = useState<NovelChapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // State cho infinite scroll và sectioned reveal
  const [contentSections, setContentSections] = useState<string[]>([]);
  const [visibleSections, setVisibleSections] = useState(INITIAL_SECTIONS_TO_SHOW);
  const [shouldSectionContent, setShouldSectionContent] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchChapterDetails = async () => {
      setLoading(true);
      try {
        const response = await axios.get<ApiResponse>(
          `${process.env.NEXT_PUBLIC_API_URL}/v1/novel_series/${seriesSlug}/novel_chapters/${chapterSlug}`
        );
        setChapter(response.data.novel_chapter);
        setSeries(response.data.novel_series);
        setPrevChapter(response.data.navigation.prev_chapter);
        setNextChapter(response.data.navigation.next_chapter);
      } catch (err) {
        setError("Có lỗi xảy ra khi tải dữ liệu chương truyện.");
        console.error("Error fetching chapter details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchChapterDetails();
  }, [seriesSlug, chapterSlug]);

  // Xử lý nội dung chương khi đã tải xong
  useEffect(() => {
    if (!chapter) return;
    
    // Phân tích nội dung để quyết định có nên chia thành các phần hay không
    const content = chapter.content;
    
    // Đếm số ký tự
    const charCount = content.length;
    
    // Đếm số đoạn văn (giả sử đoạn văn được ngăn cách bằng \n)
    const paragraphCount = (content.match(/\n/g) || []).length + 1;
    
    // Đếm số từ (đơn giản là đếm khoảng trắng + 1)
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    
    // Kiểm tra ngưỡng để quyết định có nên chia thành các phần hay không
    const shouldSection = 
      charCount > CONTENT_THRESHOLDS.CHARACTERS ||
      paragraphCount > CONTENT_THRESHOLDS.PARAGRAPHS ||
      wordCount > CONTENT_THRESHOLDS.WORDS;
    
    setShouldSectionContent(shouldSection);
    
    if (shouldSection) {
      // Chia nội dung thành các phần
      const sections = splitContentIntoSections(content);
      setContentSections(sections);
    } else {
      // Không cần chia, đặt toàn bộ nội dung vào một phần
      setContentSections([content]);
      setVisibleSections(1);
      setReachedEnd(true);
    }
  }, [chapter]);

  // Hàm chia nội dung thành các phần
  const splitContentIntoSections = (content: string): string[] => {
    // Chia theo đoạn văn
    const paragraphs = content.split('\n');
    const sections: string[] = [];
    const paragraphsPerSection = Math.max(5, Math.ceil(paragraphs.length / 5)); // Khoảng 5 đoạn văn mỗi phần
    
    for (let i = 0; i < paragraphs.length; i += paragraphsPerSection) {
      const sectionParagraphs = paragraphs.slice(i, i + paragraphsPerSection);
      sections.push(sectionParagraphs.join('\n'));
    }
    
    return sections;
  };

  // Thiết lập Intersection Observer để tự động tải thêm nội dung khi cuộn đến cuối
  useEffect(() => {
    if (!shouldSectionContent || reachedEnd || contentSections.length === 0) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0] && entries[0].isIntersecting && !isLoadingMore) {
          loadMoreContent();
        }
      },
      { threshold: 0.5 }
    );
    
    const loadMoreElement = loadMoreRef.current;
    if (loadMoreElement) {
      observer.observe(loadMoreElement);
    }
    
    observerRef.current = observer;
    
    return () => {
      if (observerRef.current && loadMoreElement) {
        observerRef.current.disconnect();
      }
    };
  }, [shouldSectionContent, contentSections, visibleSections, isLoadingMore, reachedEnd]);

  // Hàm tải thêm nội dung
  const loadMoreContent = () => {
    if (isLoadingMore || reachedEnd) return;
    
    setIsLoadingMore(true);
    
    // Giả lập độ trễ để người dùng thấy được hiệu ứng tải
    setTimeout(() => {
      const nextVisibleSections = Math.min(visibleSections + 2, contentSections.length);
      setVisibleSections(nextVisibleSections);
      
      if (nextVisibleSections >= contentSections.length) {
        setReachedEnd(true);
      }
      
      setIsLoadingMore(false);
    }, 500);
  };

  // Hiển thị nội dung dựa trên số phần hiện tại
  const visibleContent = useMemo(() => {
    return contentSections.slice(0, visibleSections).join('\n');
  }, [contentSections, visibleSections]);

  // Tính phần trăm đã đọc
  const readingProgress = useMemo(() => {
    if (contentSections.length === 0) return 0;
    return Math.min(100, Math.round((visibleSections / contentSections.length) * 100));
  }, [contentSections, visibleSections]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY) {
        // Cuộn xuống
        setShowNavbar(false);
      } else {
        // Cuộn lên
        setShowNavbar(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Phím mũi tên trái: chương trước
      if (e.key === "ArrowLeft" && prevChapter) {
        window.location.href = `/novel-series/${seriesSlug}/${prevChapter.slug || prevChapter.id}`;
      }
      // Phím mũi tên phải: chương tiếp theo
      else if (e.key === "ArrowRight" && nextChapter) {
        window.location.href = `/novel-series/${seriesSlug}/${nextChapter.slug || nextChapter.id}`;
      }
      // Phím Escape: quay lại trang chi tiết truyện
      else if (e.key === "Escape") {
        window.location.href = `/novel-series/${seriesSlug}`;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [seriesSlug, prevChapter, nextChapter]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error || !chapter || !series) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-500 text-white p-4 rounded-lg mb-8">
          {error || "Không tìm thấy chương truyện."}
        </div>
        <Link
          href={`/novel-series/${seriesSlug}`}
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Quay lại trang truyện
        </Link>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Navigation bar */}
      <div
        className={`fixed top-0 left-0 right-0 ${
          theme === 'dark' ? 'bg-gray-800 shadow-md' : 'bg-white shadow-md border-b border-gray-200'
        } z-10 transition-transform duration-300 ${
          showNavbar ? "transform translate-y-0" : "transform -translate-y-full"
        }`}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Link
                href={`/novel-series/${seriesSlug}`}
                className="text-blue-500 hover:underline flex items-center mr-4"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="hidden md:inline">Quay lại</span>
              </Link>
              <h1 className="text-lg font-medium truncate max-w-[200px] md:max-w-none">
                <span className="hidden md:inline">{series.title} - </span>
                <span>Chương {chapter.chapter_number}</span>
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              {shouldSectionContent && (
                <div className={`hidden md:block px-2 py-1 rounded-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <span className="text-xs font-medium">Đã đọc: {readingProgress}%</span>
                </div>
              )}
              <ThemeToggle className="w-8 h-8" />
              <div className="hidden md:flex items-center space-x-2">
                {prevChapter && (
                  <Link
                    href={`/novel-series/${seriesSlug}/${prevChapter.slug || prevChapter.id}`}
                    className={`px-3 py-1 ${
                      theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    } rounded-lg flex items-center`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="ml-1">Chương trước</span>
                  </Link>
                )}
                {nextChapter && (
                  <Link
                    href={`/novel-series/${seriesSlug}/${nextChapter.slug || nextChapter.id}`}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                  >
                    <span className="mr-1">Chương sau</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chapter content */}
      <div className="container mx-auto px-4 pt-24 pb-32 md:pb-20">
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white border border-gray-200'} rounded-lg p-6 md:p-8`}>
          <h1 className="text-2xl md:text-3xl font-bold mb-2 text-center">
            Chương {chapter.chapter_number}: {chapter.title}
          </h1>
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-center mb-8`}>
            Cập nhật: {formatDate(chapter.updated_at)}
          </p>

          <div
            ref={contentRef}
            className={`prose max-w-none ${theme === 'dark' ? 'prose-invert' : ''}`}
            dangerouslySetInnerHTML={{ __html: visibleContent.replace(/\n/g, "<br />") }}
          ></div>
          
          {shouldSectionContent && !reachedEnd && (
            <div 
              ref={loadMoreRef} 
              className="flex flex-col items-center justify-center py-8"
            >
              {isLoadingMore ? (
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              ) : (
                <button 
                  onClick={loadMoreContent}
                  className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white flex items-center`}
                >
                  Tải thêm nội dung
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
              <div className="mt-2 text-sm text-gray-500">
                Đã đọc {readingProgress}% nội dung
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 hidden md:flex justify-between items-center">
          {prevChapter ? (
            <Link
              href={`/novel-series/${seriesSlug}/${prevChapter.slug || prevChapter.id}`}
              className={`px-4 py-2 ${
                theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              } rounded-lg flex items-center`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Chương trước
            </Link>
          ) : (
            <div></div>
          )}

          <Link
            href={`/novel-series/${seriesSlug}`}
            className={`px-4 py-2 ${
              theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            } rounded-lg`}
          >
            Danh sách chương
          </Link>

          {nextChapter ? (
            <Link
              href={`/novel-series/${seriesSlug}/${nextChapter.slug || nextChapter.id}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              Chương sau
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 ml-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </Link>
          ) : (
            <div></div>
          )}
        </div>
      </div>

      {/* Reading tips */}
      <div className={`fixed bottom-0 left-0 right-0 ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-white border-t border-gray-200'
      } py-2 px-4 text-center text-xs ${
        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
      }`}>
        <p>Phím mũi tên trái/phải để chuyển chương. Phím ESC để quay lại trang truyện.</p>
      </div>

      {/* Mobile navigation buttons */}
      <div className={`md:hidden fixed bottom-12 left-0 right-0 flex justify-center items-center gap-4 py-3 px-4 ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-white border-t border-gray-200'
      }`}>
        {prevChapter && (
          <Link
            href={`/novel-series/${seriesSlug}/${prevChapter.slug || prevChapter.id}`}
            className={`flex-1 px-3 py-2 ${
              theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'
            } text-center rounded-lg ${
              theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-300'
            }`}
          >
            Chương trước
          </Link>
        )}

        <Link
          href={`/novel-series/${seriesSlug}`}
          className={`flex-1 px-3 py-2 ${
            theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'
          } text-center rounded-lg ${
            theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-300'
          }`}
        >
          Danh sách
        </Link>

        {nextChapter && (
          <Link
            href={`/novel-series/${seriesSlug}/${nextChapter.slug || nextChapter.id}`}
            className="flex-1 px-3 py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700"
          >
            Chương sau
          </Link>
        )}
      </div>
      
      {/* Reading progress indicator for mobile */}
      {shouldSectionContent && (
        <div className={`md:hidden fixed bottom-0 left-0 right-0 h-1 bg-gray-300`}>
          <div 
            className="h-full bg-blue-500"
            style={{ width: `${readingProgress}%` }}
          ></div>
        </div>
      )}
    </div>
  );
}
