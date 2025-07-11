/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useEffect, useRef, JSX } from "react";
import Image from "next/image";
import Link from "next/link";
import { chapterApi, userApi, mangaApi, commentApi } from "../../../../../services/api";
import { useAuth } from "../../../../../hooks/useAuth";
import { useParams } from "next/navigation";

interface ChapterImage {
  position: number;
  url: string;
  is_external: boolean;
}

interface ChapterSummary {
  id: number;
  number: number;
  title: string;
}

interface Chapter {
  id: number;
  title: string;
  number: number;
  view_count: number;
  created_at: string;
  updated_at: string;
  manga: {
    id: number;
    title: string;
  };
  images: ChapterImage[];
  next_chapter?: {
    id: number;
    number: number;
  };
  prev_chapter?: {
    id: number;
    number: number;
  };
}

interface Comment {
  id: number;
  content: string;
  sticker?: string;
  stickers?: string[];
  createdAt: string;
  has_replies?: boolean;
  replies?: Comment[];
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
  const [commentHtml, setCommentHtml] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStickers, setSelectedStickers] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  // const [readingMode, setReadingMode] = useState<"vertical" | "horizontal">("vertical");
  const [showBottomNav, setShowBottomNav] = useState(false);
  const [allChapters, setAllChapters] = useState<ChapterSummary[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const stickerPickerRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLDivElement>(null);

  // Add click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (stickerPickerRef.current && !stickerPickerRef.current.contains(event.target as Node)) {
        setShowStickerPicker(false);
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
      // const documentHeight = document.documentElement.scrollHeight;
      
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
            console.log("mangaData", mangaData)
            // Cập nhật chapter với manga data mới
            setChapter(prev => {
              if (!prev) return null;
              return {
                ...prev,
                manga: {
                  ...prev.manga,
                  id: prev.manga?.id || parseInt(mangaId),
                  title: prev.manga?.title || mangaData.title,
                  view_count: mangaData.view_count
                }
              };
            });
          } catch (err) {
            console.error("Failed to add to reading history:", err);
          }
        }

        // Fetch comments
        try {
          const commentsData = await commentApi.getChapterComments(mangaId, chapterId);
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
          },
          next_chapter: undefined,
          images: [
            {
              position: 0,
              url: "https://m.media-amazon.com/images/I/51FVFCrSp0L._AC_UF1000,1000_QL80_.jpg",
              is_external: false
            },
            {
              position: 1,
              url: "https://m.media-amazon.com/images/I/81qb4I6rbsL._AC_UF1000,1000_QL80_.jpg",
              is_external: false
            },
            {
              position: 2,
              url: "https://m.media-amazon.com/images/I/51QQuG9myeL._AC_UF1000,1000_QL80_.jpg",
              is_external: false
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
        images: chapter.images,
      });
    }
  }, [chapter]);

  const insertStickerAtCursor = (stickerUrl: string) => {
    const el = commentInputRef.current;
    if (!el) return;
    el.focus();
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const img = document.createElement("img");
    img.src = stickerUrl;
    img.alt = "Sticker";
    img.className = "inline h-8 w-8 align-middle mx-1";
    range.insertNode(img);
    // Di chuyển con trỏ sau ảnh
    range.setStartAfter(img);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    // Cập nhật state
    setCommentHtml(el.innerHTML);
    setShowStickerPicker(false);
  };

  const handleSelectSticker = (sticker: string) => {
    insertStickerAtCursor(sticker);
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    setCommentHtml(e.currentTarget.innerHTML);
  };

  const extractStickersAndTextFromHtml = (html: string): {text: string, stickers: string[]} => {
    const div = document.createElement("div");
    div.innerHTML = html;
    const stickers: string[] = [];
    // Lấy text, thay img bằng placeholder nếu muốn
    const walker = document.createTreeWalker(div, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null);
    let text = "";
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === "IMG") {
        const url = (node as HTMLImageElement).src;
        stickers.push(url);
        text += ` [sticker:${url}] `; // hoặc chỉ để trống nếu không muốn placeholder
      }
    }
    return { text: text.trim(), stickers };
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const { text, stickers } = extractStickersAndTextFromHtml(commentHtml);
    if (!text && stickers.length === 0) return;
    try {
      setIsSubmitting(true);
      let newComment: any;
      if (replyingTo) {
        newComment = await commentApi.replyToComment(
          chapterId,
          replyingTo.id,
          text,
          stickers.length > 0 ? stickers : undefined
        );
        setComments(prevComments => {
          return prevComments.map(comment => {
            if (comment.id === replyingTo.id) {
              return {
                ...comment,
                has_replies: true,
                replies: [...(comment.replies || []), newComment]
              };
            }
            return comment;
          });
        });
      } else {
        newComment = await commentApi.addChapterComment(
          mangaId,
          chapterId,
          text,
          stickers.length > 0 ? stickers : undefined
        );
        setComments([newComment, ...comments]);
      }
      setCommentHtml("");
      if (commentInputRef.current) commentInputRef.current.innerHTML = "";
      setReplyingTo(null);
      setShowStickerPicker(false);
    } catch (err) {
      console.error("Failed to submit comment:", err);
      alert("Không thể gửi bình luận. Vui lòng thử lại sau.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCommentContent = (content: string) => {
    if (!content) return null;
    const regex = /\[sticker:(.*?)\]/g;
    const parts: (JSX.Element | string)[] = [];
    let lastIndex = 0;
    let match;
    let key = 0;
    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={key++}>{content.substring(lastIndex, match.index)}</span>);
      }
      if (match[1]) {
        parts.push(<img key={key++} src={match[1]} alt="Sticker" className="inline h-8 w-8 align-middle mx-1" />);
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < content.length) {
      parts.push(<span key={key++}>{content.substring(lastIndex)}</span>);
    }
    return parts;
  };

  const handleReplyToComment = (comment: Comment) => {
    setReplyingTo(comment);
    // Scroll to comment form
    document.getElementById('comment-form')?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const cancelReply = () => {
    setReplyingTo(null);
  };

  // const toggleReadingMode = () => {
  //   setReadingMode(readingMode === "vertical" ? "horizontal" : "vertical");
  // };

  // Helper function to get the image URL from different possible sources
  const getImageUrl = (image: ChapterImage): string => {
    return image.url || '';
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
    <div className="max-w-[53rem] mx-auto px-2">
      {/* Top Navigation Bar */}
      <div className="bg-gray-800 p-4 rounded mb-4 sticky top-0 z-10">
        <div className="flex flex-col space-y-3">
          <div className="flex items-center">
            <Link href={`/manga/${mangaId}`} className="text-gray-300 hover:text-red-500 mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </Link>
            <div className="overflow-hidden">
              <h1 className="text-lg font-bold truncate">
                <Link href={`/manga/${mangaId}`} className="hover:text-red-500">
                  {chapter.manga?.title || "Đang tải..."}
                </Link>
              </h1>
              <p className="text-sm text-gray-400 truncate">Chapter {chapter.number || ""} {chapter.title ? `- ${chapter.title}` : ""}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center">
            {/* <button
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
            </button> */}
            
            <div className="flex flex-1 min-w-0 gap-2 flex-wrap sm:flex-nowrap">
              <Link
                href={`/manga/${mangaId}/chapter/${chapter.prev_chapter?.id}`}
                className="bg-red-700 hover:bg-red-600 px-3 py-1 rounded text-sm whitespace-nowrap"
              >
                Chương trước
              </Link>
              
              <div className="relative flex-1 min-w-0 w-full" ref={dropdownRef}>
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
                  <div className="absolute z-50 w-full mt-1 bg-gray-700 rounded shadow-lg max-w-full left-0 right-0">
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
                          <span className="truncate block">Chapter {chap.number} - {chap.title}</span>
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
      <div className={`space-y-1`}>
        {(chapter.images || []).map((image, index) => (
          <div 
            key={`image-${image.position}`} 
            className={`chapter-image`}
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
          {/* Form bình luận tổng luôn ở đầu */}
          {isAuthenticated ? (
            <div className="mb-4">
              <form id="comment-form" onSubmit={handleSubmitComment}>
                {selectedStickers.length > 0 && !replyingTo && (
                  <div className="mb-2 p-2 bg-gray-700 rounded flex flex-wrap gap-2 items-center">
                    {selectedStickers.map((sticker) => (
                      <div key={sticker} className="flex items-center mr-2 mb-1">
                        <img src={sticker} alt="Selected sticker" className="h-10 w-10 mr-1" />
                        <button type="button" onClick={() => setSelectedStickers(selectedStickers.filter((s) => s !== sticker))} className="text-gray-400 hover:text-white">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                    ))}
                      <span className="text-sm">Sticker đã chọn</span>
                  </div>
                )}
                <div
                  ref={commentInputRef}
                  className="w-full bg-gray-700 text-white rounded p-3 focus:outline-none focus:ring-1 focus:ring-red-500 min-h-[60px] relative"
                  contentEditable
                  onInput={handleInput}
                  suppressContentEditableWarning={true}
                >
                  {commentHtml === "" && <span className="text-gray-400 pointer-events-none select-none absolute left-3 top-3">Viết bình luận của bạn...</span>}
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <div className="relative" ref={stickerPickerRef}>
                    <button 
                      type="button" 
                      onClick={() => setShowStickerPicker(!showStickerPicker)}
                      className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.536 5.879a1 1 0 001.414 0 3 3 0 014.242 0 1 1 0 001.414-1.414 5 5 0 00-7.07 0 1 1 0 000 1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {showStickerPicker && !replyingTo && (
                      <div className="block p-2 bg-gray-700 rounded shadow-lg grid grid-cols-4 gap-2">
                        {/* Stickers */}
                        <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742760.png')} className="p-1 hover:bg-gray-600 rounded">
                          <Image
                            src="https://cdn-icons-png.flaticon.com/128/742/742760.png"
                            alt="Sticker 1"
                            width={32}
                            height={32}
                            className="w-8 h-8"
                          />                        
                        </button>
                        <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742751.png')} className="p-1 hover:bg-gray-600 rounded">
                          <img src="https://cdn-icons-png.flaticon.com/128/742/742751.png" alt="Sticker 2" className="w-8 h-8" />
                        </button>
                        <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742784.png')} className="p-1 hover:bg-gray-600 rounded">
                          <img src="https://cdn-icons-png.flaticon.com/128/742/742784.png" alt="Sticker 3" className="w-8 h-8" />
                        </button>
                        <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742750.png')} className="p-1 hover:bg-gray-600 rounded">
                          <img src="https://cdn-icons-png.flaticon.com/128/742/742750.png" alt="Sticker 4" className="w-8 h-8" />
                        </button>
                        <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742745.png')} className="p-1 hover:bg-gray-600 rounded">
                          <img src="https://cdn-icons-png.flaticon.com/128/742/742745.png" alt="Sticker 5" className="w-8 h-8" />
                        </button>
                        <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742821.png')} className="p-1 hover:bg-gray-600 rounded">
                          <img src="https://cdn-icons-png.flaticon.com/128/742/742821.png" alt="Sticker 6" className="w-8 h-8" />
                        </button>
                        <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742752.png')} className="p-1 hover:bg-gray-600 rounded">
                          <img src="https://cdn-icons-png.flaticon.com/128/742/742752.png" alt="Sticker 7" className="w-8 h-8" />
                        </button>
                        <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742920.png')} className="p-1 hover:bg-gray-600 rounded">
                          <img src="https://cdn-icons-png.flaticon.com/128/742/742920.png" alt="Sticker 8" className="w-8 h-8" />
                        </button>
                      </div>
                    )}
                  </div>
                  <button 
                    type="submit" 
                    disabled={isSubmitting || (!commentHtml.trim() && selectedStickers.length === 0)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting && (
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {"Gửi bình luận"}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="mb-4 p-3 bg-gray-700 rounded text-center">
              <p>Vui lòng <Link href="/auth/login" className="text-red-400 hover:underline">đăng nhập</Link> để bình luận</p>
            </div>
          )}
          {/* Danh sách bình luận và form trả lời dưới từng comment */}
            {comments.length > 0 ? (
              comments.map((comment) => (
              <div key={comment.id} className="bg-gray-700 rounded p-3 mb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center mr-2">
                        {comment.user && comment.user.avatar ? (
                          <Image 
                            src={comment.user.avatar} 
                            alt={comment.user.username || 'User'} 
                            width={32} 
                            height={32} 
                            className="rounded-full"
                          />
                        ) : (
                          <span>{comment.user && comment.user.username ? comment.user.username.charAt(0).toUpperCase() : '?'}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{comment.user ? comment.user.username : 'Unknown User'}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {isAuthenticated && (
                      <button 
                        onClick={() => handleReplyToComment(comment)}
                        className="text-sm text-gray-400 hover:text-white"
                      >
                        Trả lời
                      </button>
                    )}
                  </div>
                {(Array.isArray(comment.stickers) && comment.stickers.length > 0) ? (
                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                    {comment.stickers.map((sticker: string, idx: number) => (
                      <img key={idx} src={sticker} alt="Sticker" className="h-16 w-16" />
                    ))}
                    {comment.content && <span className="ml-2 text-sm">{renderCommentContent(comment.content)}</span>}
                  </div>
                ) : comment.sticker ? (
                    <div className="mt-2">
                      <img src={comment.sticker} alt="Sticker" className="h-16 w-16" />
                    </div>
                  ) : (
                    <div className="mt-2 text-sm">{renderCommentContent(comment.content)}</div>
                  )}
                {/* Form trả lời ngay dưới comment nếu đang trả lời comment này */}
                {isAuthenticated && replyingTo && replyingTo.id === comment.id && (
                  <div className="mt-3">
                    <form id="comment-form" onSubmit={handleSubmitComment}>
                      <div className="bg-gray-700 p-2 mb-2 rounded flex justify-between items-center">
                        <div className="text-sm">
                          Đang trả lời <span className="font-semibold text-blue-500">{replyingTo.user?.username || 'Unknown'}</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={cancelReply}
                          className="text-gray-400 hover:text-white"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                      {selectedStickers.length > 0 && (
                        <div className="mb-2 p-2 bg-gray-700 rounded flex flex-wrap gap-2 items-center">
                          {selectedStickers.map((sticker) => (
                            <div key={sticker} className="flex items-center mr-2 mb-1">
                              <img src={sticker} alt="Selected sticker" className="h-10 w-10 mr-1" />
                              <button type="button" onClick={() => setSelectedStickers(selectedStickers.filter((s) => s !== sticker))} className="text-gray-400 hover:text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          ))}
                          <span className="text-sm">Sticker đã chọn</span>
                        </div>
                      )}
                      <div
                        ref={commentInputRef}
                        className="w-full bg-gray-700 text-white rounded p-3 focus:outline-none focus:ring-1 focus:ring-red-500 min-h-[60px] relative"
                        contentEditable
                        onInput={handleInput}
                        suppressContentEditableWarning={true}
                      >
                        {commentHtml === "" && <span className="text-gray-400 pointer-events-none select-none absolute left-3 top-3">Viết trả lời của bạn...</span>}
                      </div>
                      <div className="mt-2 flex justify-between items-center">
                        <div className="relative" ref={stickerPickerRef}>
                          <button 
                            type="button" 
                            onClick={() => setShowStickerPicker(!showStickerPicker)}
                            className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.536 5.879a1 1 0 001.414 0 3 3 0 014.242 0 1 1 0 001.414-1.414 5 5 0 00-7.07 0 1 1 0 000 1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                          {showStickerPicker && (
                            <div className="block p-2 bg-gray-700 rounded shadow-lg grid grid-cols-4 gap-2">
                              {/* Stickers */}
                              <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742760.png')} className="p-1 hover:bg-gray-600 rounded">
                                <Image
                                  src="https://cdn-icons-png.flaticon.com/128/742/742760.png"
                                  alt="Sticker 1"
                                  width={32}
                                  height={32}
                                  className="w-8 h-8"
                                />                        
                              </button>
                              <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742751.png')} className="p-1 hover:bg-gray-600 rounded">
                                <img src="https://cdn-icons-png.flaticon.com/128/742/742751.png" alt="Sticker 2" className="w-8 h-8" />
                              </button>
                              <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742784.png')} className="p-1 hover:bg-gray-600 rounded">
                                <img src="https://cdn-icons-png.flaticon.com/128/742/742784.png" alt="Sticker 3" className="w-8 h-8" />
                              </button>
                              <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742750.png')} className="p-1 hover:bg-gray-600 rounded">
                                <img src="https://cdn-icons-png.flaticon.com/128/742/742750.png" alt="Sticker 4" className="w-8 h-8" />
                              </button>
                              <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742745.png')} className="p-1 hover:bg-gray-600 rounded">
                                <img src="https://cdn-icons-png.flaticon.com/128/742/742745.png" alt="Sticker 5" className="w-8 h-8" />
                              </button>
                              <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742821.png')} className="p-1 hover:bg-gray-600 rounded">
                                <img src="https://cdn-icons-png.flaticon.com/128/742/742821.png" alt="Sticker 6" className="w-8 h-8" />
                              </button>
                              <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742752.png')} className="p-1 hover:bg-gray-600 rounded">
                                <img src="https://cdn-icons-png.flaticon.com/128/742/742752.png" alt="Sticker 7" className="w-8 h-8" />
                              </button>
                              <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742920.png')} className="p-1 hover:bg-gray-600 rounded">
                                <img src="https://cdn-icons-png.flaticon.com/128/742/742920.png" alt="Sticker 8" className="w-8 h-8" />
                              </button>
                            </div>
                          )}
                        </div>
                        <button 
                          type="submit" 
                          disabled={isSubmitting || (!commentHtml.trim() && selectedStickers.length === 0)}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmitting && (
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          )}
                          {"Gửi bình luận"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
                  {/* Replies */}
                  {comment.has_replies && comment.replies && comment.replies.length > 0 && (
                    <div className="mt-3 pl-4 border-l-2 border-gray-600 space-y-3">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="bg-gray-800 rounded p-2">
                          <div className="flex items-center">
                            <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center mr-2">
                              {reply.user && reply.user.avatar ? (
                                <Image 
                                  src={reply.user.avatar} 
                                  alt={reply.user.username || 'User'} 
                                  width={24} 
                                  height={24} 
                                  className="rounded-full"
                                />
                              ) : (
                                <span className="text-xs">{reply.user && reply.user.username ? reply.user.username.charAt(0).toUpperCase() : '?'}</span>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-xs">{reply.user ? reply.user.username : 'Unknown User'}</p>
                              <p className="text-xs text-gray-400">
                                {new Date(reply.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        {/* Hiển thị tên user cha màu xanh dương ở đầu reply */}
                        <div className="mt-1">
                          <span className="text-blue-500 font-semibold mr-1">@{comment.user?.username}</span>
                          {Array.isArray(reply.stickers) && reply.stickers.length > 0 ? (
                            <div className="inline-flex items-center gap-2">
                              {reply.stickers.map((st, idx) => (
                                <img key={idx} src={st} alt={`Sticker ${idx}`} className="h-12 w-12" />
                              ))}
                              {reply.content && <span className="text-xs">{renderCommentContent(reply.content)}</span>}
                            </div>
                          ) : reply.sticker ? (
                            <img src={reply.sticker} alt="Sticker" className="h-12 w-12 inline-block align-middle" />
                          ) : (
                            <span className="text-xs align-middle">{renderCommentContent(reply.content)}</span>
                          )}
                        </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center text-gray-400 text-sm">Chưa có bình luận nào. Hãy là người đầu tiên bình luận!</p>
            )}
        </div>
      </div>
    </div>
  );
} 
