"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { chapterApi, userApi, mangaApi } from "../../../../../services/api";
import { useAuth } from "../../../../../hooks/useAuth";
import { useParams } from "next/navigation";

interface ChapterImage {
  id: number;
  position: number;
  image?: string;
  image_url?: string;
  url?: string;
}

interface ChapterSummary {
  id: number;
  number: number;
  title: string;
}

interface Chapter {
  id: number;
  number: number;
  title: string;
  view_count: number;
  created_at: string;
  updated_at: string;
  manga?: {
    id: number;
    title: string;
    chapters?: ChapterSummary[];
  };
  next_chapter?: ChapterSummary | null;
  prev_chapter?: ChapterSummary | null;
  chapter_images?: ChapterImage[];
}

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  user: {
    id: number;
    username: string;
    avatar?: string;
  };
}

export default function ChapterReader() {
  const params = useParams();
  const mangaId = params.id as string;
  const chapterId = params.chapterId as string;
  const { isAuthenticated } = useAuth();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [readingMode, setReadingMode] = useState<"vertical" | "horizontal">("vertical");
  const [showBottomNav, setShowBottomNav] = useState(false);
  const [allChapters, setAllChapters] = useState<ChapterSummary[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Add click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Thêm effect để theo dõi scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Hiển thị navigation khi scroll xuống 20% trang
      setShowBottomNav(scrollPosition > windowHeight * 0.2);

      // Tính toán trang hiện tại dựa trên scroll position
      const images = document.querySelectorAll('.chapter-image');
      let currentImageIndex = 0;
      
      images.forEach((image, index) => {
        const rect = image.getBoundingClientRect();
        if (rect.top <= windowHeight / 2) {
          currentImageIndex = index;
        }
      });
      
      setCurrentPage(currentImageIndex);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchChapter = async () => {
      try {
        setIsLoading(true);
        const data = await chapterApi.getChapter(mangaId, chapterId);
        console.log("Chapter data:", data);
        setChapter(data);

        // Fetch tất cả chapters của manga
        try {
          const chapters = await chapterApi.getMangaChapters(mangaId);
          // Sắp xếp chapters theo số thứ tự
          const sortedChapters = [...chapters].sort((a, b) => a.number - b.number);
          setAllChapters(sortedChapters);
        } catch (err) {
          console.error("Failed to fetch manga chapters:", err);
        }

        // Thêm vào lịch sử đọc nếu đã đăng nhập
        if (isAuthenticated) {
          try {
            await userApi.addToReadingHistory(mangaId, chapterId);
            // Refresh manga data after adding to reading history
            const mangaData = await mangaApi.getManga(mangaId);
            if (chapter?.manga) {
              setChapter(prev => prev ? {
                ...prev,
                manga: {
                  ...prev.manga,
                  view_count: mangaData.view_count
                }
              } : null);
            }
          } catch (err) {
            console.error("Failed to add to reading history:", err);
          }
        }

        // Fetch comments
        try {
          const commentsData = await chapterApi.getChapterComments(mangaId, chapterId);
          setComments(commentsData);
        } catch (err) {
          console.error("Failed to fetch comments:", err);
        }
      } catch (err) {
        console.error("Failed to fetch chapter:", err);
        setError("Không thể tải chapter. Vui lòng thử lại sau.");
        
        // Fallback to mock data
        setChapter({
          id: parseInt(chapterId),
          number: 1088,
          title: "Cuộc chiến cuối cùng",
          view_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          manga: {
            id: parseInt(mangaId),
            title: "One Piece",
          },
          prev_chapter: {
            id: 2,
            number: 1087,
            title: "Chapter 1087"
          },
          next_chapter: null,
          chapter_images: [
            {
              id: 1,
              position: 0,
              image: "https://m.media-amazon.com/images/I/51FVFCrSp0L._AC_UF1000,1000_QL80_.jpg",
            },
            {
              id: 2,
              position: 1,
              image: "https://m.media-amazon.com/images/I/81qb4I6rbsL._AC_UF1000,1000_QL80_.jpg",
            },
            {
              id: 3,
              position: 2,
              image: "https://m.media-amazon.com/images/I/51QQuG9myeL._AC_UF1000,1000_QL80_.jpg",
            },
          ],
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchChapter();
  }, [mangaId, chapterId, isAuthenticated]);

  // Hàm debug để kiểm tra cấu trúc dữ liệu chapter
  useEffect(() => {
    if (chapter) {
      console.log("Chapter structure:", {
        id: chapter.id,
        number: chapter.number,
        title: chapter.title,
        manga: chapter.manga,
        images: chapter.chapter_images,
      });
    }
  }, [chapter]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setIsSubmitting(true);
      const newComment = await chapterApi.addChapterComment(mangaId, chapterId, commentText);
      setComments([newComment, ...comments]);
      setCommentText("");
    } catch (err) {
      console.error("Failed to submit comment:", err);
      alert("Không thể gửi bình luận. Vui lòng thử lại sau.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleReadingMode = () => {
    setReadingMode(readingMode === "vertical" ? "horizontal" : "vertical");
  };

  // Helper function to get the image URL from different possible sources
  const getImageUrl = (image: ChapterImage): string => {
    if (image.image_url) return image.image_url;
    if (image.url) return image.url;
    if (typeof image.image === 'string') return image.image;
    if (typeof image.image === 'object' && image.image && 'url' in image.image) {
      return (image.image as { url: string }).url || '';
    }
    return '';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (error || !chapter) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500 mb-4">{error || "Không tìm thấy chapter"}</p>
        <Link href={`/manga/${mangaId}`} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">
          Quay lại danh sách chương
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[35rem] mx-auto px-2">
      {/* Top Navigation Bar */}
      <div className="bg-gray-800 p-4 rounded mb-4 sticky top-0 z-10">
        <div className="flex flex-col space-y-3">
          <div className="flex items-center">
            <Link href={`/manga/${mangaId}`} className="text-gray-300 hover:text-red-500 mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </Link>
            <div>
              <h1 className="text-lg font-bold">
                <Link href={`/manga/${mangaId}`} className="hover:text-red-500">
                  {chapter.manga?.title || "Đang tải..."}
                </Link>
              </h1>
              <p className="text-sm text-gray-400">Chapter {chapter.number || ""} {chapter.title ? `- ${chapter.title}` : ""}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={toggleReadingMode}
              className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm flex items-center"
            >
              {readingMode === "vertical" ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  Dọc
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM9 15a1 1 0 011-1h6a1 1 0 110 2h-6a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  Ngang
                </>
              )}
            </button>
            
            <div className="flex flex-1 min-w-0 gap-2">
              <Link
                href={`/manga/${mangaId}/chapter/${chapter.prev_chapter?.id}`}
                className="bg-red-700 hover:bg-red-600 px-3 py-1 rounded text-sm whitespace-nowrap"
              >
                Chương trước
              </Link>
              
              <div className="relative flex-1 min-w-0" ref={dropdownRef}>
                <button
                  className="w-full bg-gray-700 text-white px-3 py-1 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500 flex items-center justify-between"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <span className="truncate">
                    Chapter {chapter.number} - {chapter.title}
                  </span>
                  <svg
                    className={`w-4 h-4 ml-2 transition-transform ${isDropdownOpen ? 'transform rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-gray-700 rounded shadow-lg">
                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                      {allChapters.map((chap) => (
                        <Link
                          key={chap.id}
                          href={`/manga/${mangaId}/chapter/${chap.id}`}
                          className={`block px-3 py-2 text-sm hover:bg-gray-600 ${
                            chap.id.toString() === chapterId ? 'bg-gray-600' : ''
                          }`}
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          Chapter {chap.number} - {chap.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <Link
                href={`/manga/${mangaId}/chapter/${chapter.next_chapter?.id}`}
                className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm whitespace-nowrap"
              >
                Chương sau
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Chapter Images */}
      <div className={`${readingMode === "vertical" ? "space-y-1" : "flex overflow-x-auto whitespace-nowrap pb-4"}`}>
        {(chapter.chapter_images || []).map((image, index) => (
          <div 
            key={image.id} 
            className={`chapter-image ${readingMode === "horizontal" ? "inline-block mr-1" : ""}`}
          >
            <img
              src={getImageUrl(image)}
              alt={`Chapter ${chapter.number || ""} - Page ${image.position + 1}`}
              width={800}
              height={1200}
              className="w-full h-auto"
            />
          </div>
        ))}
      </div>
      
      {/* Floating Navigation Buttons */}
      {showBottomNav && (
        <div className="fixed bottom-4 right-4 flex gap-2">
          {currentPage > 0 && chapter.prev_chapter && (
            <Link
              href={`/manga/${mangaId}/chapter/${chapter.prev_chapter.id}`}
              className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-full shadow-lg flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Chapter trước
            </Link>
          )}
          
          {chapter.next_chapter && (
            <Link
              href={`/manga/${mangaId}/chapter/${chapter.next_chapter.id}`}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full shadow-lg flex items-center"
            >
              Chapter sau
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          )}
        </div>
      )}
      
      {/* Comments Section */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4 pb-2 border-b border-gray-700">Bình luận</h2>
        <div className="bg-gray-800 rounded p-4">
          {isAuthenticated ? (
            <div className="mb-4">
              <form onSubmit={handleSubmitComment}>
                <textarea 
                  className="w-full bg-gray-700 text-white rounded p-3 focus:outline-none focus:ring-1 focus:ring-red-500"
                  placeholder="Viết bình luận của bạn..."
                  rows={3}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  required
                />
                <div className="mt-2 text-right">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center ml-auto"
                  >
                    {isSubmitting && (
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    Gửi bình luận
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="mb-4 p-3 bg-gray-700 rounded text-center">
              <p>Vui lòng <Link href="/auth/login" className="text-red-400 hover:underline">đăng nhập</Link> để bình luận</p>
            </div>
          )}
          
          <div className="space-y-4 mt-6">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} className="bg-gray-700 rounded p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center mr-2">
                        {comment.user.avatar ? (
                          <Image 
                            src={comment.user.avatar} 
                            alt={comment.user.username} 
                            width={32} 
                            height={32} 
                            className="rounded-full"
                          />
                        ) : (
                          <span>{comment.user.username.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{comment.user.username}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-sm">{comment.content}</p>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-400 text-sm">Chưa có bình luận nào. Hãy là người đầu tiên bình luận!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
