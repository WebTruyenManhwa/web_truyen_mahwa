"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { chapterApi, userApi } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { useParams } from "next/navigation";

interface ChapterImage {
  id: number;
  position: number;
  image?: string;
  url?: string;
}

interface Chapter {
  id: number;
  number: number;
  title: string;
  manga?: {
    id: number;
    title: string;
  };
  prevChapter?: { id: number; number: number } | null;
  nextChapter?: { id: number; number: number } | null;
  images?: ChapterImage[];
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
  // Sử dụng useParams hook thay vì truy cập trực tiếp params
  const params = useParams();
  const mangaId = params.id as string;
  const chapterNumber = params.chapterId as string;
  const { isAuthenticated } = useAuth();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [readingMode, setReadingMode] = useState<"vertical" | "horizontal">("vertical");

  useEffect(() => {
    const fetchChapter = async () => {
      try {
        setIsLoading(true);
        const data = await chapterApi.getChapter(mangaId, chapterNumber);
        console.log("Chapter data:", data); // Log dữ liệu để kiểm tra
        setChapter(data);
        // Thêm vào lịch sử đọc nếu đã đăng nhập
        if (isAuthenticated) {
          try {
            await userApi.addToReadingHistory(mangaId, chapterNumber);
          } catch (err) {
            console.error("Failed to add to reading history:", err);
          }
        }

        // Fetch comments
        try {
          const commentsData = await chapterApi.getChapterComments(mangaId, chapterNumber);
          setComments(commentsData);
        } catch (err) {
          console.error("Failed to fetch comments:", err);
        }
      } catch (err) {
        console.error("Failed to fetch chapter:", err);
        setError("Không thể tải chapter. Vui lòng thử lại sau.");
        
        // Fallback to mock data
        setChapter({
          id: parseInt(chapterNumber),
          number: 1088,
          title: "Cuộc chiến cuối cùng",
          manga: {
            id: parseInt(mangaId),
            title: "One Piece",
          },
          prevChapter: {
            id: 2,
            number: 1087,
          },
          nextChapter: null,
          images: [
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
  }, [mangaId, chapterNumber, isAuthenticated]);

  // Hàm debug để kiểm tra cấu trúc dữ liệu chapter
  useEffect(() => {
    if (chapter) {
      console.log("Chapter structure:", {
        id: chapter.id,
        number: chapter.number,
        title: chapter.title,
        manga: chapter.manga,
        images: chapter.images,
        chapter_images: chapter.chapter_images
      });
    }
  }, [chapter]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setIsSubmitting(true);
      const newComment = await chapterApi.addChapterComment(mangaId, chapterNumber, commentText);
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
    <div className="max-w-5xl mx-auto">
      {/* Top Navigation Bar */}
      <div className="bg-gray-800 p-4 rounded mb-4 sticky top-0 z-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-2">
          <div className="flex items-center">
            <Link href={`/manga/${mangaId}`} className="text-gray-300 hover:text-red-500 mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </Link>
            <div>
              <h1 className="text-lg font-bold">
                <Link href={`/manga/${mangaId}`} className="hover:text-red-500">
                  {chapter?.title || "Đang tải..."}
                </Link>
              </h1>
              <p className="text-sm text-gray-400">Chapter {chapter?.number || ""} {chapter?.title ? `- ${chapter.title}` : ""}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
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
            
            {chapter?.prevChapter && (
              <Link
                href={`/manga/${mangaId}/chapter/${chapter.prevChapter.id}`}
                className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm"
              >
                Chương trước
              </Link>
            )}
            
            <select
              className="bg-gray-700 text-white px-3 py-1 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
              defaultValue={chapterNumber}
              onChange={(e) => {
                if (e.target.value) {
                  window.location.href = `/manga/${mangaId}/chapter/${e.target.value}`;
                }
              }}
            >
              <option value={chapterNumber}>Chapter {chapter?.number || ""}</option>
              {chapter?.prevChapter && (
                <option value={chapter.prevChapter.id}>
                  Chapter {chapter.prevChapter.number}
                </option>
              )}
              {chapter?.nextChapter && (
                <option value={chapter.nextChapter.id}>
                  Chapter {chapter.nextChapter.number}
                </option>
              )}
            </select>
            
            {chapter?.nextChapter && (
              <Link
                href={`/manga/${mangaId}/chapter/${chapter.nextChapter.id}`}
                className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
              >
                Chương sau
              </Link>
            )}
          </div>
        </div>
      </div>
      
      {/* Chapter Images */}
      <div className={`${readingMode === "vertical" ? "space-y-1" : "flex overflow-x-auto whitespace-nowrap pb-4"}`}>
        {(chapter?.images || chapter?.chapter_images || []).map((image) => (
          <div 
            key={image.id} 
            className={`${readingMode === "horizontal" ? "inline-block mr-1" : ""}`}
          >
            {console.log("image", image.image)}
            <img
              src={image.image.url || ""}
              alt={`Chapter ${chapter?.number || ""} - Page ${image.position + 1}`}
              width={800}
              height={1200}
              className="w-full h-auto"
              priority={image.position < 3} // Chỉ ưu tiên tải 3 trang đầu tiên
            />
          </div>
        ))}
      </div>
      
      {/* Bottom Navigation */}
      <div className="bg-gray-800 p-4 rounded mt-4 sticky bottom-0 z-10">
        <div className="flex justify-between items-center">
          <Link href={`/manga/${mangaId}`} className="text-gray-300 hover:text-red-500 text-sm">
            Quay lại danh sách chương
          </Link>
          
          <div className="flex items-center space-x-2">
            {chapter?.prevChapter && (
              <Link
                href={`/manga/${mangaId}/chapter/${chapter.prevChapter.id}`}
                className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm"
              >
                Chương trước
              </Link>
            )}
            
            {chapter?.nextChapter && (
              <Link
                href={`/manga/${mangaId}/chapter/${chapter.nextChapter.id}`}
                className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
              >
                Chương sau
              </Link>
            )}
          </div>
        </div>
      </div>
      
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
