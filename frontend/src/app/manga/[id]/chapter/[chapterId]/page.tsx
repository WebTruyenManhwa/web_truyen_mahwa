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
import { useTheme } from "../../../../../hooks/useTheme";
import ThemeToggle from "../../../../../components/ThemeToggle";
import ErrorReportDialog from "../../../../../components/ErrorReportDialog";

interface ChapterImage {
  position: number;
  url?: string;
  external_url?: string;
  is_external: boolean;
  image?: string | null;
}

interface ChapterSummary {
  id: number;
  number: number;
  title: string;
  slug?: string;
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
    slug?: string;
  };
  images: ChapterImage[];
  next_chapter?: {
    id: number;
    number: number;
    slug?: string;
  };
  prev_chapter?: {
    id: number;
    number: number;
    slug?: string;
  };
  slug?: string;
}

interface Comment {
  id: number;
  content: string;
  sticker?: string;
  stickers?: string[];
  createdAt: string;
  has_replies?: boolean;
  replies?: Comment[];
  user?: {
    id: number;
    username: string;
    avatar?: string;
  };
  user_id?: number;
}

export default function ChapterReader() {
  const { theme } = useTheme();
  const params = useParams();
  const mangaId = params.id as string;
  const chapterId = params.chapterId as string;
  const { isAuthenticated } = useAuth();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [totalComments, setTotalComments] = useState(0);
  const [commentHtml, setCommentHtml] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStickers, setSelectedStickers] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchTerm, setGifSearchTerm] = useState("");
  const [gifResults, setGifResults] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("trending");
  const [showBottomNav, setShowBottomNav] = useState(false);
  const [allChapters, setAllChapters] = useState<ChapterSummary[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const stickerPickerRef = useRef<HTMLDivElement>(null);
  const gifPickerRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLDivElement>(null);
  const replyCommentInputRef = useRef<HTMLDivElement>(null);
  const replyToReplyCommentInputRef = useRef<HTMLDivElement>(null);
  const [isMainCommentFocused, setIsMainCommentFocused] = useState(false);
  const [isReplyFocused, setIsReplyFocused] = useState(false);
  const [showTopNav, setShowTopNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isErrorReportOpen, setIsErrorReportOpen] = useState(false);
  const [replyingToReply, setReplyingToReply] = useState<{commentId: number, replyId: number} | null>(null);

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    const intervals = {
      năm: 31536000,
      tháng: 2592000,
      tuần: 604800,
      ngày: 86400,
      giờ: 3600,
      phút: 60,
      giây: 1
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return interval === 1 ? `1 ${unit} trước` : `${interval} ${unit} trước`;
      }
    }

    return 'vừa xong';
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (stickerPickerRef.current && !stickerPickerRef.current.contains(event.target as Node)) {
        setShowStickerPicker(false);
      }
      if (gifPickerRef.current && !gifPickerRef.current.contains(event.target as Node)) {
        setShowGifPicker(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;

      if (scrollPosition > lastScrollY) {
        setShowTopNav(false);
      } else {
        setShowTopNav(true);
      }

      setLastScrollY(scrollPosition);

      setShowBottomNav(scrollPosition > windowHeight * 0.2);

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
  }, [lastScrollY]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' ||
          document.activeElement?.tagName === 'TEXTAREA' ||
          document.activeElement?.getAttribute('contenteditable') === 'true') {
        return;
      }

      if (e.key === 'ArrowLeft' && chapter?.prev_chapter) {
        window.location.href = `/manga/${chapter.manga?.slug || mangaId}/chapter/${chapter.prev_chapter?.slug || chapter.prev_chapter?.id}`;
      } else if (e.key === 'ArrowRight' && chapter?.next_chapter) {
        window.location.href = `/manga/${chapter.manga?.slug || mangaId}/chapter/${chapter.next_chapter?.slug || chapter.next_chapter?.id}`;
      } else if (e.key === 'Escape' && chapter) {
        window.location.href = `/manga/${chapter.manga?.slug || mangaId}`;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chapter, mangaId]);

  useEffect(() => {
    const fetchChapter = async () => {
      try {
        setIsLoading(true);
        let actualMangaId = mangaId;
        let mangaData: any = null;

        try {
          mangaData = await mangaApi.getManga(mangaId);
          if (mangaData && mangaData.id) {
            actualMangaId = mangaData.id.toString();
            console.log("Using actual manga ID:", actualMangaId);
          }
        } catch (err) {
          console.error("Failed to fetch manga:", err);
        }

        if (isNaN(Number(actualMangaId))) {
          console.error("Could not determine numeric manga ID");
          throw new Error("Could not determine manga ID");
        }

        const data = await chapterApi.getChapter(actualMangaId, chapterId);
        console.log("Chapter data:", data);

        setChapter(data);

        try {
          const chaptersData = await chapterApi.getMangaChapters(actualMangaId);
          const sortedChapters = chaptersData && chaptersData.chapters && Array.isArray(chaptersData.chapters)
            ? [...chaptersData.chapters].sort((a, b) => b.number - a.number)
            : [];
          setAllChapters(sortedChapters);
        } catch (err) {
          console.error("Failed to fetch manga chapters:", err);
        }

        if (isAuthenticated) {
          try {
            await userApi.addToReadingHistory(actualMangaId, chapterId);
            if (!mangaData) {
              mangaData = await mangaApi.getManga(actualMangaId);
            }
            console.log("mangaData", mangaData);

            setChapter(prev => {
              if (!prev) return null;
              return {
                ...prev,
                manga: {
                  ...prev.manga,
                  id: prev.manga?.id || parseInt(actualMangaId),
                  title: prev.manga?.title || mangaData.title,
                  view_count: mangaData.view_count
                }
              };
            });
          } catch (err) {
            console.error("Failed to add to reading history:", err);
          }
        }

        try {
          const commentsData = await commentApi.getChapterComments(actualMangaId, chapterId);
          setComments(commentsData);

          try {
            const totalCommentsData = await commentApi.getMangaComments(actualMangaId);
            setTotalComments(totalCommentsData.length || 0);
          } catch (err) {
            console.error("Failed to fetch total comments:", err);
            setTotalComments(commentsData.length || 0);
          }
        } catch (err) {
          console.error("Failed to fetch comments:", err);
        }

        fetchGifs("trending");
      } catch (err) {
        console.error("Failed to fetch chapter:", err);
        setError("Không thể tải chapter. Vui lòng thử lại sau.");

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

  const insertStickerAtCursor = (stickerUrl: string) => {
    // Xác định input nào đang được sử dụng dựa vào trạng thái reply
    let el = commentInputRef.current;
    if (replyingTo && !replyingToReply) {
      el = replyCommentInputRef.current;
    } else if (replyingToReply) {
      el = replyToReplyCommentInputRef.current;
    }
    
    if (!el) return;
    el.focus();

    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      try {
        setTimeout(() => {
          el.focus();
          const range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false);
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }, 100);
      } catch (e) {
        console.error("Mobile focus error:", e);
      }
    }

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const img = document.createElement("img");
    img.src = stickerUrl;
    img.alt = "Sticker";
    img.className = "inline h-8 w-8 align-middle mx-1";
    range.insertNode(img);
    range.setStartAfter(img);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    setCommentHtml(el.innerHTML);
    setShowStickerPicker(false);
  };

  const focusContentEditableForMobile = (el: HTMLElement | null) => {
    if (!el) return;

    el.focus();
    try {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } catch (e) {
      console.error("Mobile focus error:", e);
    }
  };

  const handleSelectSticker = (sticker: string) => {
    insertStickerAtCursor(sticker);
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    setCommentHtml(e.currentTarget.innerHTML);
    // Kiểm tra nếu nội dung rỗng hoặc chỉ có khoảng trắng
    if (!e.currentTarget.textContent?.trim()) {
      setIsReplyFocused(false); // Đặt lại trạng thái focus khi nội dung rỗng
    }
  };

  const extractStickersAndTextFromHtml = (html: string): {text: string, stickers: string[]} => {
    const div = document.createElement("div");
    div.innerHTML = html;
    const stickers: string[] = [];

    const placeholders = ["Viết bình luận của bạn...", "Viết trả lời của bạn..."];

    const walker = document.createTreeWalker(div, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null);
    let text = "";
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) {
        const content = node.textContent?.trim() || "";
        if (!placeholders.includes(content)) {
          text += node.textContent;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === "IMG") {
        const url = (node as HTMLImageElement).src;
        stickers.push(url);
        text += ` [sticker:${url}] `;
      }
    }
    return { text: text.trim(), stickers };
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const { text, stickers } = extractStickersAndTextFromHtml(commentHtml);

    // Kiểm tra nếu không có nội dung thực sự hoặc sticker
    const placeholders = ["Viết bình luận của bạn...", "Viết trả lời của bạn..."];
    const hasRealText = text && !placeholders.includes(text.trim());

    if (!hasRealText && stickers.length === 0) return;

    try {
      setIsSubmitting(true);
      let newComment: any;

      // Lấy thông tin user từ localStorage để đảm bảo hiển thị đúng
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

      // Trường hợp 1: Đang trả lời một reply (replyingToReply có giá trị)
      if (replyingToReply) {
        // Tìm comment gốc dựa vào commentId trong replyingToReply
        const parentComment = comments.find(c => c.id === replyingToReply.commentId);
        // Tìm reply được trả lời
        const targetReply = parentComment?.replies?.find(r => r.id === replyingToReply.replyId);
        const replyToUsername = targetReply?.user?.username || 
                               (targetReply?.user_id ? getUserInfo(targetReply.user_id).username : "Unknown");

        if (parentComment) {
          // Tạo reply comment với parent_id là ID của comment gốc (không phải ID của reply)
          newComment = await commentApi.addChapterComment(
            mangaId,
            chapterId,
            hasRealText ? `@${replyToUsername} ${text}` : `@${replyToUsername}`,
            stickers.length > 0 ? stickers : undefined,
            parentComment.id // Truyền parent_id là ID của comment gốc
          );

          // Đảm bảo reply mới có đầy đủ thông tin
          const formattedReply = {
            ...newComment,
            createdAt: newComment.createdAt || new Date().toISOString(),
            user: newComment.user || currentUser, // Đảm bảo có thông tin user
            user_id: currentUser.id // Thêm user_id để đảm bảo có thể lấy thông tin user khi reload
          };

          // Cập nhật state để hiển thị reply mới
          setComments(prevComments => {
            return prevComments.map(comment => {
              if (comment.id === parentComment.id) {
                // Đảm bảo replies là một mảng và có cấu trúc đúng
                const currentReplies = Array.isArray(comment.replies) ? comment.replies : [];
                return {
                  ...comment,
                  has_replies: true,
                  replies: [...currentReplies, formattedReply]
                };
              }
              return comment;
            });
          });
        }
      }
      // Trường hợp 2: Đang trả lời comment gốc (replyingTo có giá trị)
      else if (replyingTo) {
        // Lấy username của người được trả lời
        const replyToUsername = replyingTo.user?.username || 
                               (replyingTo.user_id ? getUserInfo(replyingTo.user_id).username : "Unknown");
        
        // Tạo reply comment
        newComment = await commentApi.addChapterComment(
          mangaId,
          chapterId,
          hasRealText ? `@${replyToUsername} ${text}` : `@${replyToUsername}`,
          stickers.length > 0 ? stickers : undefined,
          replyingTo.id // Truyền parent_id trực tiếp qua tham số
        );

        // Đảm bảo reply có thông tin user đầy đủ từ localStorage
        const formattedReply = {
          ...newComment,
          createdAt: newComment.createdAt || new Date().toISOString(),
          user: newComment.user || currentUser, // Đảm bảo có thông tin user
          user_id: currentUser.id // Thêm user_id để đảm bảo có thể lấy thông tin user khi reload
        };

        // Cập nhật state để hiển thị reply mới
        setComments(prevComments => {
          return prevComments.map(comment => {
            if (comment.id === replyingTo.id) {
              // Đảm bảo replies là một mảng và có cấu trúc đúng
              const currentReplies = Array.isArray(comment.replies) ? comment.replies : [];
              return {
                ...comment,
                has_replies: true,
                replies: [...currentReplies, formattedReply]
              };
            }
            return comment;
          });
        });
      }
      // Trường hợp 3: Tạo comment mới (không phải reply)
      else {
        // Tạo comment mới
        newComment = await commentApi.addChapterComment(
          mangaId,
          chapterId,
          hasRealText ? text : "",
          stickers.length > 0 ? stickers : undefined
        );

        // Đảm bảo comment mới có thông tin user đầy đủ
        const formattedComment = {
          ...newComment,
          user: newComment.user || currentUser,
          user_id: currentUser.id // Thêm user_id để đảm bảo có thể lấy thông tin user khi reload
        };

        // Thêm comment mới vào đầu danh sách
        setComments([formattedComment, ...comments]);
      }

      // Reset form
      setCommentHtml("");
      if (commentInputRef.current) commentInputRef.current.innerHTML = "";
      if (replyCommentInputRef.current) replyCommentInputRef.current.innerHTML = "";
      if (replyToReplyCommentInputRef.current) replyToReplyCommentInputRef.current.innerHTML = "";
      setReplyingTo(null);
      setReplyingToReply(null);
      setShowStickerPicker(false);
      setShowGifPicker(false);
    } catch (err) {
      console.error("Failed to submit comment:", err);
      alert("Không thể gửi bình luận. Vui lòng thử lại sau.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCommentContent = (content: string, isReply: boolean = false) => {
    if (!content || content.trim() === "") return null;

    const placeholders = ["Viết bình luận của bạn...", "Viết trả lời của bạn..."];
    if (placeholders.includes(content.trim())) return null;

    // Nếu là reply, xóa @mention từ nội dung
    let processedContent = content;
    if (isReply) {
      processedContent = content.replace(/@[a-zA-Z0-9_]+ /, '');
    }

    const regex = /\[sticker:(.*?)\]/g;
    const parts: (JSX.Element | string)[] = [];
    let lastIndex = 0;
    let match;
    let key = 0;
    while ((match = regex.exec(processedContent)) !== null) {
      if (match.index > lastIndex) {
        const textPart = processedContent.substring(lastIndex, match.index).trim();
        if (textPart && !placeholders.includes(textPart)) {
          parts.push(<span key={key++}>{textPart}</span>);
        }
      }
      if (match[1]) {
        parts.push(<img key={key++} src={match[1]} alt="Sticker" className="inline h-8 w-8 align-middle mx-1" />);
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < processedContent.length) {
      const remainingText = processedContent.substring(lastIndex).trim();
      if (remainingText && !placeholders.includes(remainingText)) {
        parts.push(<span key={key++}>{remainingText}</span>);
      }
    }
    return parts.length > 0 ? parts : null;
  };

  const handleReplyToComment = (comment: Comment, replyId?: number) => {
    if (replyId) {
      setReplyingToReply({commentId: comment.id, replyId: replyId});
      setReplyingTo(null);
    } else {
      setReplyingTo(comment);
      setReplyingToReply(null);
      document.getElementById('comment-form')?.scrollIntoView({ behavior: 'smooth' });
    }

    setTimeout(() => {
      if (commentInputRef.current && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        focusContentEditableForMobile(commentInputRef.current);
      }
    }, 500);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyingToReply(null);
  };

  const getImageUrl = (image: ChapterImage): string => {
    let finalUrl = '';

    if (image.is_external && image.external_url) {
      finalUrl = image.external_url;
    } else {
      finalUrl = image.url || image.image || '';
    }

    const result = finalUrl && finalUrl.trim() !== ''
      ? finalUrl
      : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200" fill="none"%3E%3Crect width="800" height="1200" fill="%23f0f0f0"/%3E%3Ctext x="400" y="600" font-family="Arial" font-size="24" text-anchor="middle" fill="%23999999"%3EImage not available%3C/text%3E%3C/svg%3E';

    return result;
  };

  const fetchGifs = async (category: string = "trending", search: string = "") => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_API_KEY_TENOR;
      const limit = 15;
      let url = "";

      if (search) {
        url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(search)}&key=${apiKey}&limit=${limit}`;
      } else if (category === "trending") {
        url = `https://tenor.googleapis.com/v2/featured?key=${apiKey}&limit=${limit}`;
      } else {
        let searchTerm = "";
        switch(category) {
          case "qoobee":
            searchTerm = "qoobee agapi";
            break;
          case "capoo":
            searchTerm = "capoo cat";
            break;
          case "pepe":
            searchTerm = "pepe frog funny";
            break;
          case "onion":
            searchTerm = "onion head";
            break;
          case "anime":
            searchTerm = "anime reaction";
            break;
          case "reactions":
            searchTerm = "reaction gif";
            break;
          default:
            searchTerm = category;
        }
        url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(searchTerm)}&key=${apiKey}&limit=${limit}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data && data.results) {
        const gifs = data.results.map((item: any) => {
          return item.media_formats.gif.url;
        });
        setGifResults(gifs);
      } else {
        setGifResults([]);
      }
    } catch (error) {
      console.error("Error fetching GIFs:", error);
      setGifResults([]);
    }
  };

  const handleSelectGif = (gifUrl: string) => {
    insertStickerAtCursor(gifUrl);
    setShowGifPicker(false);
  };

  useEffect(() => {
    if (gifResults.length === 0) {
      fetchGifs("trending");
    }
  }, [gifResults.length]);

  const getUserInfo = (userId: number) => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    if (currentUser && currentUser.id === userId) {
      return {
        id: currentUser.id,
        username: currentUser.username || 'User',
        avatar: currentUser.avatar
      };
    }

    // Tìm user trong danh sách comments
    for (const comment of comments) {
      if (comment.user && comment.user.id === userId) {
        return {
          id: comment.user.id,
          username: comment.user.username || 'User',
          avatar: comment.user.avatar
        };
      }
      
      // Tìm trong replies
      if (comment.replies) {
        for (const reply of comment.replies) {
          if (reply.user && reply.user.id === userId) {
            return {
              id: reply.user.id,
              username: reply.user.username || 'User',
              avatar: reply.user.avatar
            };
          }
        }
      }
    }

    return {
      id: userId,
      username: 'User',
      avatar: undefined
    };
  };

  const onBlurHandler = () => {
    // Kiểm tra nếu nội dung rỗng hoặc chỉ có khoảng trắng
    if (!commentHtml.trim() || 
        (commentInputRef.current && !commentInputRef.current.textContent?.trim()) ||
        (replyCommentInputRef.current && !replyCommentInputRef.current.textContent?.trim()) ||
        (replyToReplyCommentInputRef.current && !replyToReplyCommentInputRef.current.textContent?.trim())) {
      
      // Xác định input nào đang được sử dụng dựa vào trạng thái reply
      if (replyingTo && !replyingToReply) {
        setIsReplyFocused(false);
      } else if (replyingToReply) {
        setIsReplyFocused(false);
      } else {
        setIsMainCommentFocused(false);
      }
    }
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
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white border border-gray-200'} p-4 rounded mb-4 sticky top-0 z-10 transition-transform duration-300 ${showTopNav ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href={`/manga/${mangaId}`} className={`${theme === 'dark' ? 'text-gray-300 hover:text-red-500' : 'text-gray-700 hover:text-red-500'} mr-2`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </Link>
              <div className="overflow-hidden">
                <h1 className="text-lg font-bold truncate">
                  <Link href={`/manga/${chapter.manga?.slug || mangaId}`} className="hover:text-red-500">
                    {chapter.manga?.title || "Đang tải..."}
                  </Link>
                </h1>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} truncate`}>Chapter {chapter.number || ""} {chapter.title ? `- ${chapter.title}` : ""}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Báo lỗi button */}
              <button
                onClick={() => setIsErrorReportOpen(true)}
                className={`px-2 py-1 rounded text-xs ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                } flex items-center`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Báo lỗi
              </button>
              <ThemeToggle className="w-8 h-8" />
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
                href={`/manga/${chapter.manga?.slug || mangaId}/chapter/${chapter.prev_chapter?.slug || chapter.prev_chapter?.id}`}
                className="bg-red-700 hover:bg-red-600 px-3 py-1 rounded text-sm whitespace-nowrap text-white"
              >
                Chương trước
              </Link>

              <div className="relative flex-1 min-w-0 w-full" ref={dropdownRef}>
                <button
                  className={`w-full ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'} px-3 py-1 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500 flex items-center justify-between`}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <span className="truncate">
                    Chapter {chapter.number}
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
                  <div className={`absolute z-50 w-full mt-1 ${theme === 'dark' ? 'bg-gray-700' : 'bg-white border border-gray-200'} rounded shadow-lg max-w-full left-0 right-0`}>
                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                      {allChapters.map((chap) => (
                        <Link
                          key={chap.id}
                          href={`/manga/${chapter.manga?.slug || mangaId}/chapter/${chap.slug || chap.id}`}
                          className={`block px-3 py-2 text-sm ${
                            theme === 'dark'
                              ? `hover:bg-gray-600 ${chap.id.toString() === chapterId ? 'bg-gray-600' : ''}`
                              : `hover:bg-gray-100 ${chap.id.toString() === chapterId ? 'bg-gray-100' : ''}`
                          }`}
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <span className="truncate block">Chapter {chap.number}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Link
                href={`/manga/${chapter.manga?.slug || mangaId}/chapter/${chapter.next_chapter?.slug || chapter.next_chapter?.id}`}
                className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm whitespace-nowrap text-white"
              >
                Chương sau
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Chapter Images */}
      <div className="space-y-0">
        {(chapter.images || []).map((image, _index) => (
          <div
            key={`image-${image.position}`}
            className="chapter-image"
            style={{ marginBottom: 0, lineHeight: 0 }}
          >
            <img
              src={getImageUrl(image)}
              alt={`Chapter ${chapter.number || ""} - Page ${image.position + 1}`}
              width={800}
              height={1200}
              className="w-full h-auto"
              style={{ display: 'block' }}
            />
          </div>
        ))}
      </div>

      {/* Floating Navigation Buttons */}
      {showBottomNav && (
        <div className="fixed bottom-4 right-4 flex gap-2">
          {currentPage > 0 && chapter.prev_chapter && (
            <Link
              href={`/manga/${chapter.manga?.slug || mangaId}/chapter/${chapter.prev_chapter?.slug || chapter.prev_chapter?.id}`}
              className={`${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100 border border-gray-200'} text-white px-4 py-2 rounded-full shadow-lg flex items-center`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              <span className={theme === 'dark' ? 'text-white' : 'text-gray-800'}>Chapter trước</span>
            </Link>
          )}

          {chapter.next_chapter && (
            <Link
              href={`/manga/${chapter.manga?.slug || mangaId}/chapter/${chapter.next_chapter?.slug || chapter.next_chapter?.id}`}
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
        <h2 className={`text-xl font-bold mb-4 pb-2 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'} flex items-center justify-between`}>
          <div>
            Bình luận
            <span className="ml-2 text-sm font-normal text-gray-500">({totalComments})</span>
          </div>
        </h2>
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white border border-gray-200'} rounded p-4`}>
          {/* Form bình luận tổng luôn ở đầu */}
          {isAuthenticated ? (
            <div className="mb-4">
              <form id="comment-form" onSubmit={handleSubmitComment}>
                {selectedStickers.length > 0 && !replyingTo && (
                  <div className={`mb-2 p-2 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'} rounded flex flex-wrap gap-2 items-center`}>
                    {selectedStickers.map((sticker) => (
                      <div key={sticker} className="flex items-center mr-2 mb-1">
                        <img src={sticker} alt="Selected sticker" className="h-10 w-10 mr-1" />
                        <button type="button" onClick={() => setSelectedStickers(selectedStickers.filter((s) => s !== sticker))} className={`${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}>
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
                  className={`w-full ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'} rounded p-3 focus:outline-none focus:ring-1 focus:ring-red-500 min-h-[60px] relative ${theme === 'dark' ? '' : 'border border-gray-300'}`}
                  contentEditable
                  onInput={handleInput}
                  suppressContentEditableWarning={true}
                  onFocus={() => {
                    setIsMainCommentFocused(true);
                    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                      focusContentEditableForMobile(commentInputRef.current);
                    }
                  }}
                  onBlur={onBlurHandler}
                >
                  {commentHtml === "" && !isMainCommentFocused && <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} absolute left-3 top-3 opacity-70`}>Viết bình luận của bạn...</span>}
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <div className="flex space-x-2">
                    <div className="relative" ref={stickerPickerRef}>
                      <button
                        type="button"
                        onClick={() => {
                          setShowStickerPicker(!showStickerPicker);
                          setShowGifPicker(false);
                        }}
                        className={`${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} p-2 rounded`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.536 5.879a1 1 0 001.414 0 3 3 0 014.242 0 1 1 0 001.414-1.414 5 5 0 00-7.07 0 1 1 0 000 1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                      {showStickerPicker && !replyingTo && (
                        <div className={`block p-2 ${theme === 'dark' ? 'bg-gray-700' : 'bg-white border border-gray-200'} rounded shadow-lg grid grid-cols-4 gap-2`}>
                          {/* Stickers */}
                          <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742760.png')} className={`p-1 ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'} rounded`}>
                            <Image
                              src="https://cdn-icons-png.flaticon.com/128/742/742760.png"
                              alt="Sticker 1"
                              width={32}
                              height={32}
                              className="w-8 h-8"
                            />
                          </button>
                          <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742751.png')} className={`p-1 ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'} rounded`}>
                            <img src="https://cdn-icons-png.flaticon.com/128/742/742751.png" alt="Sticker 2" className="w-8 h-8" />
                          </button>
                          <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742784.png')} className={`p-1 ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'} rounded`}>
                            <img src="https://cdn-icons-png.flaticon.com/128/742/742784.png" alt="Sticker 3" className="w-8 h-8" />
                          </button>
                          <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742750.png')} className={`p-1 ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'} rounded`}>
                            <img src="https://cdn-icons-png.flaticon.com/128/742/742750.png" alt="Sticker 4" className="w-8 h-8" />
                          </button>
                          <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742745.png')} className={`p-1 ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'} rounded`}>
                            <img src="https://cdn-icons-png.flaticon.com/128/742/742745.png" alt="Sticker 5" className="w-8 h-8" />
                          </button>
                          <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742821.png')} className={`p-1 ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'} rounded`}>
                            <img src="https://cdn-icons-png.flaticon.com/128/742/742821.png" alt="Sticker 6" className="w-8 h-8" />
                          </button>
                          <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742752.png')} className={`p-1 ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'} rounded`}>
                            <img src="https://cdn-icons-png.flaticon.com/128/742/742752.png" alt="Sticker 7" className="w-8 h-8" />
                          </button>
                          <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742920.png')} className={`p-1 ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'} rounded`}>
                            <img src="https://cdn-icons-png.flaticon.com/128/742/742920.png" alt="Sticker 8" className="w-8 h-8" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* GIF Picker Button */}
                    <div className="relative" ref={gifPickerRef}>
                      <button
                        type="button"
                        onClick={() => {
                          setShowGifPicker(!showGifPicker);
                          setShowStickerPicker(false);
                        }}
                        className={`${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} p-2 rounded`}
                      >
                        <span className="font-bold">GIF</span>
                      </button>

                      {showGifPicker && !replyingTo && (
                        <div className={`block p-2 ${theme === 'dark' ? 'bg-gray-700' : 'bg-white border border-gray-200'} rounded shadow-lg absolute z-10 left-0 w-[300px]`}>
                          {/* GIF Search */}
                          <div className="mb-2">
                            <input
                              type="text"
                              placeholder="Tìm kiếm GIF..."
                              value={gifSearchTerm}
                              onChange={(e) => setGifSearchTerm(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  fetchGifs(selectedCategory, gifSearchTerm);
                                }
                              }}
                              className={`w-full p-2 rounded ${theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-800'} mb-2`}
                            />
                          </div>

                          {/* GIF Categories */}
                          <div className="flex mb-2 space-x-2 flex-wrap gap-y-2">
                            <button
                              onClick={() => {
                                setSelectedCategory("trending");
                                fetchGifs("trending", gifSearchTerm);
                              }}
                              className={`px-2 py-1 rounded text-xs ${selectedCategory === "trending"
                                ? 'bg-red-600 text-white'
                                : theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                            >
                              Xu hướng
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCategory("qoobee");
                                fetchGifs("qoobee", gifSearchTerm);
                              }}
                              className={`px-2 py-1 rounded text-xs ${selectedCategory === "qoobee"
                                ? 'bg-red-600 text-white'
                                : theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                            >
                              Qoobee
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCategory("capoo");
                                fetchGifs("capoo", gifSearchTerm);
                              }}
                              className={`px-2 py-1 rounded text-xs ${selectedCategory === "capoo"
                                ? 'bg-red-600 text-white'
                                : theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                            >
                              Capoo
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCategory("pepe");
                                fetchGifs("pepe", gifSearchTerm);
                              }}
                              className={`px-2 py-1 rounded text-xs ${selectedCategory === "pepe"
                                ? 'bg-red-600 text-white'
                                : theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                            >
                              Pepe
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCategory("onion");
                                fetchGifs("onion", gifSearchTerm);
                              }}
                              className={`px-2 py-1 rounded text-xs ${selectedCategory === "onion"
                                ? 'bg-red-600 text-white'
                                : theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                            >
                              Onion Head
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCategory("anime");
                                fetchGifs("anime", gifSearchTerm);
                              }}
                              className={`px-2 py-1 rounded text-xs ${selectedCategory === "anime"
                                ? 'bg-red-600 text-white'
                                : theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                            >
                              Anime
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCategory("reactions");
                                fetchGifs("reactions", gifSearchTerm);
                              }}
                              className={`px-2 py-1 rounded text-xs ${selectedCategory === "reactions"
                                ? 'bg-red-600 text-white'
                                : theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                            >
                              Biểu cảm
                            </button>
                          </div>

                          {/* GIF Results */}
                          <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                            {gifResults.map((gif, index) => (
                              <div
                                key={index}
                                className="cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => handleSelectGif(gif)}
                              >
                                <img src={gif} alt={`GIF ${index}`} className="w-full h-auto rounded" />
                              </div>
                            ))}
                            {gifResults.length === 0 && (
                              <div className="col-span-2 text-center py-4 text-sm text-gray-500">
                                Không tìm thấy GIF nào
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || ((!commentHtml.trim() || !commentInputRef.current?.textContent?.trim()) && selectedStickers.length === 0)}
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
            <div className={`mb-4 p-3 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'} rounded text-center ${theme === 'dark' ? '' : 'border border-gray-300'}`}>
              <p>Vui lòng <Link href="/auth/login" className="text-red-400 hover:underline">đăng nhập</Link> để bình luận</p>
            </div>
          )}
          {/* Danh sách bình luận và form trả lời dưới từng comment */}
            {comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} className="mb-4 flex">
                  {/* Avatar nằm ngoài khung comment */}
                  <div className="mr-3 flex-shrink-0">
                    {(() => {
                      const username = comment.user ? comment.user.username : (comment.user_id ? getUserInfo(comment.user_id).username : 'User');
                      const firstChar = username.charAt(0).toUpperCase();
                      // Tạo màu ngẫu nhiên nhưng nhất quán dựa trên tên người dùng
                      const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'];
                      const colorIndex = username.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % colors.length;
                      const bgColor = colors[colorIndex];
                      
                      return (
                        <div className={`w-10 h-10 rounded-full ${bgColor} flex items-center justify-center overflow-hidden`}>
                          {comment.user && comment.user.avatar ? (
                            <Image
                              src={comment.user.avatar}
                              alt={comment.user.username || 'User'}
                              width={40}
                              height={40}
                              className="rounded-full w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-center font-medium text-white">{firstChar}</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Nội dung comment */}
                  <div className="flex-1">
                    <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'} rounded p-3 ${theme === 'dark' ? '' : 'border border-gray-300'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{comment.user ? comment.user.username : (comment.user_id ? getUserInfo(comment.user_id).username : 'Unknown User')} <span className="text-blue-500 text-xs">Chapter {chapter?.number}</span></p>
                          <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {formatTimeAgo(comment.createdAt)}
                          </p>
                        </div>
                        {isAuthenticated && (
                          <button
                            onClick={() => handleReplyToComment(comment)}
                            className={`text-sm ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}
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
                    </div>

                    {/* Form trả lời ngay dưới comment nếu đang trả lời comment này */}
                    {isAuthenticated && replyingTo && replyingTo.id === comment.id && (
                      <div className="mt-3">
                        <form id="comment-form" onSubmit={handleSubmitComment}>
                          <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} p-2 mb-2 rounded flex justify-between items-center`}>
                            <div className="text-sm">
                              Đang trả lời <span className="font-semibold text-blue-500">{replyingTo.user ? replyingTo.user.username : (replyingTo.user_id ? getUserInfo(replyingTo.user_id).username : 'Unknown')}</span>
                            </div>
                            <button
                              type="button"
                              onClick={cancelReply}
                              className={`${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                          {selectedStickers.length > 0 && (
                            <div className={`mb-2 p-2 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded flex flex-wrap gap-2 items-center`}>
                              {selectedStickers.map((sticker) => (
                                <div key={sticker} className="flex items-center mr-2 mb-1">
                                  <img src={sticker} alt="Selected sticker" className="h-10 w-10 mr-1" />
                                  <button type="button" onClick={() => setSelectedStickers(selectedStickers.filter((s) => s !== sticker))} className={`${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
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
                            ref={replyCommentInputRef}
                            className={`w-full ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'} rounded p-3 focus:outline-none focus:ring-1 focus:ring-red-500 min-h-[60px] relative ${theme === 'dark' ? '' : 'border border-gray-300'}`}
                            contentEditable
                            onInput={handleInput}
                            suppressContentEditableWarning={true}
                            onFocus={() => {
                              setIsReplyFocused(true);
                              if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                                focusContentEditableForMobile(replyCommentInputRef.current);
                              }
                            }}
                            onBlur={onBlurHandler}
                          >
                            {commentHtml === "" && !isReplyFocused && <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} absolute left-3 top-3 opacity-70 pointer-events-none`}>Viết trả lời của bạn...</span>}
                          </div>
                          <div className="mt-2 flex justify-between items-center">
                            <div className="flex space-x-2">
                              <div className="relative" ref={stickerPickerRef}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowStickerPicker(!showStickerPicker);
                                    setShowGifPicker(false);
                                  }}
                                  className={`${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} ${theme === 'dark' ? 'text-white' : 'text-gray-800'} p-2 rounded`}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.536 5.879a1 1 0 001.414 0 3 3 0 014.242 0 1 1 0 001.414-1.414 5 5 0 00-7.07 0 1 1 0 000 1.414z" clipRule="evenodd" />
                                  </svg>
                                </button>
                                {showStickerPicker && (
                                  <div className={`block p-2 ${theme === 'dark' ? 'bg-gray-700' : 'bg-white border border-gray-200'} rounded shadow-lg grid grid-cols-4 gap-2`}>
                                    {/* Stickers */}
                                    <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742760.png')} className={`p-1 ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'} rounded`}>
                                      <Image
                                        src="https://cdn-icons-png.flaticon.com/128/742/742760.png"
                                        alt="Sticker 1"
                                        width={32}
                                        height={32}
                                        className="w-8 h-8"
                                      />
                                    </button>
                                    <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742751.png')} className={`p-1 ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'} rounded`}>
                                      <img src="https://cdn-icons-png.flaticon.com/128/742/742751.png" alt="Sticker 2" className="w-8 h-8" />
                                    </button>
                                    <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742784.png')} className={`p-1 ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'} rounded`}>
                                      <img src="https://cdn-icons-png.flaticon.com/128/742/742784.png" alt="Sticker 3" className="w-8 h-8" />
                                    </button>
                                    <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742750.png')} className={`p-1 ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'} rounded`}>
                                      <img src="https://cdn-icons-png.flaticon.com/128/742/742750.png" alt="Sticker 4" className="w-8 h-8" />
                                    </button>
                                    <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742745.png')} className={`p-1 ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'} rounded`}>
                                      <img src="https://cdn-icons-png.flaticon.com/128/742/742745.png" alt="Sticker 5" className="w-8 h-8" />
                                    </button>
                                    <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742821.png')} className={`p-1 ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'} rounded`}>
                                      <img src="https://cdn-icons-png.flaticon.com/128/742/742821.png" alt="Sticker 6" className="w-8 h-8" />
                                    </button>
                                    <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742752.png')} className={`p-1 ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'} rounded`}>
                                      <img src="https://cdn-icons-png.flaticon.com/128/742/742752.png" alt="Sticker 7" className="w-8 h-8" />
                                    </button>
                                    <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742920.png')} className={`p-1 ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'} rounded`}>
                                      <img src="https://cdn-icons-png.flaticon.com/128/742/742920.png" alt="Sticker 8" className="w-8 h-8" />
                                    </button>
                                  </div>
                                )}
                              </div>
                              
                              <div className="relative" ref={gifPickerRef}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowGifPicker(!showGifPicker);
                                    setShowStickerPicker(false);
                                  }}
                                  className={`${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} ${theme === 'dark' ? 'text-white' : 'text-gray-800'} p-2 rounded`}
                                >
                                  <span className="font-bold">GIF</span>
                                </button>
                                {showGifPicker && (
                                  <div className={`block p-2 ${theme === 'dark' ? 'bg-gray-700' : 'bg-white border border-gray-200'} rounded shadow-lg absolute z-50 bottom-full left-0 mb-2 w-[300px]`}>
                                    {/* GIF Search */}
                                    <div className="mb-2">
                                      <input
                                        type="text"
                                        placeholder="Tìm kiếm GIF..."
                                        value={gifSearchTerm}
                                        onChange={(e) => setGifSearchTerm(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            fetchGifs(selectedCategory, gifSearchTerm);
                                          }
                                        }}
                                        className={`w-full p-2 rounded ${theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-800'} mb-2`}
                                      />
                                    </div>

                                    {/* GIF Categories */}
                                    <div className="flex mb-2 space-x-2 flex-wrap gap-y-2">
                                      <button
                                        onClick={() => {
                                          setSelectedCategory("trending");
                                          fetchGifs("trending", gifSearchTerm);
                                        }}
                                        className={`px-2 py-1 rounded text-xs ${selectedCategory === "trending"
                                          ? 'bg-red-600 text-white'
                                          : theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                                      >
                                        Xu hướng
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedCategory("qoobee");
                                          fetchGifs("qoobee", gifSearchTerm);
                                        }}
                                        className={`px-2 py-1 rounded text-xs ${selectedCategory === "qoobee"
                                          ? 'bg-red-600 text-white'
                                          : theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                                      >
                                        Qoobee
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedCategory("capoo");
                                          fetchGifs("capoo", gifSearchTerm);
                                        }}
                                        className={`px-2 py-1 rounded text-xs ${selectedCategory === "capoo"
                                          ? 'bg-red-600 text-white'
                                          : theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                                      >
                                        Capoo
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedCategory("pepe");
                                          fetchGifs("pepe", gifSearchTerm);
                                        }}
                                        className={`px-2 py-1 rounded text-xs ${selectedCategory === "pepe"
                                          ? 'bg-red-600 text-white'
                                          : theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                                      >
                                        Pepe
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedCategory("onion");
                                          fetchGifs("onion", gifSearchTerm);
                                        }}
                                        className={`px-2 py-1 rounded text-xs ${selectedCategory === "onion"
                                          ? 'bg-red-600 text-white'
                                          : theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                                      >
                                        Onion Head
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedCategory("anime");
                                          fetchGifs("anime", gifSearchTerm);
                                        }}
                                        className={`px-2 py-1 rounded text-xs ${selectedCategory === "anime"
                                          ? 'bg-red-600 text-white'
                                          : theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                                      >
                                        Anime
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedCategory("reactions");
                                          fetchGifs("reactions", gifSearchTerm);
                                        }}
                                        className={`px-2 py-1 rounded text-xs ${selectedCategory === "reactions"
                                          ? 'bg-red-600 text-white'
                                          : theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                                      >
                                        Biểu cảm
                                      </button>
                                    </div>

                                    {/* GIF Results */}
                                    <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                                      {gifResults.map((gif, index) => (
                                        <div
                                          key={index}
                                          className="cursor-pointer hover:opacity-80 transition-opacity"
                                          onClick={() => handleSelectGif(gif)}
                                        >
                                          <img src={gif} alt={`GIF ${index}`} className="w-full h-auto rounded" />
                                        </div>
                                      ))}
                                      {gifResults.length === 0 && (
                                        <div className="col-span-2 text-center py-4 text-sm text-gray-500">
                                          Không tìm thấy GIF nào
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <button
                              type="submit"
                              disabled={isSubmitting || ((!commentHtml.trim() || !commentInputRef.current?.textContent?.trim()) && selectedStickers.length === 0)}
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
                      <div className="mt-3 pl-8 space-y-3">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="flex">
                            {/* Avatar của reply */}
                            <div className="mr-2 flex-shrink-0">
                              {(() => {
                                const username = reply.user ? reply.user.username : (reply.user_id ? getUserInfo(reply.user_id).username : 'User');
                                const firstChar = username.charAt(0).toUpperCase();
                                // Tạo màu ngẫu nhiên nhưng nhất quán dựa trên tên người dùng
                                const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'];
                                const colorIndex = username.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % colors.length;
                                const bgColor = colors[colorIndex];
                                
                                return (
                                  <div className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center overflow-hidden`}>
                                    {reply.user && reply.user.avatar ? (
                                      <Image
                                        src={reply.user.avatar}
                                        alt={reply.user.username || 'User'}
                                        width={32}
                                        height={32}
                                        className="rounded-full w-full h-full object-cover"
                                      />
                                    ) : (
                                      reply.user_id && getUserInfo(reply.user_id).avatar ? (
                                        <Image
                                          src={getUserInfo(reply.user_id).avatar}
                                          alt={getUserInfo(reply.user_id).username || 'User'}
                                          width={32}
                                          height={32}
                                          className="rounded-full w-full h-full object-cover"
                                        />
                                      ) : (
                                        <span className="text-xs text-white font-medium">{firstChar}</span>
                                      )
                                    )}
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Nội dung reply */}
                            <div className="flex-1">
                              <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded p-2 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
                                <div className="flex justify-between">
                                  <div>
                                    <p className="font-medium text-xs">{reply.user ? reply.user.username : (reply.user_id ? getUserInfo(reply.user_id).username : 'Unknown User')} <span className="text-blue-500 text-xs">Chapter {chapter?.number}</span></p>
                                    <p className="text-xs text-gray-400">
                                      {formatTimeAgo(reply.createdAt)}
                                    </p>
                                  </div>

                                  {/* Thêm nút trả lời cho reply */}
                                  {isAuthenticated && (
                                    <button
                                      onClick={() => handleReplyToComment(comment, reply.id)}
                                      className={`text-sm ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}
                                    >
                                      Trả lời
                                    </button>
                                  )}
                                </div>

                                {/* Hiển thị tên user cha màu xanh dương ở đầu reply */}
                                <div className="mt-1">
                                  {(() => {
                                    // Trích xuất username từ nội dung reply nếu có @mention
                                    const mentionMatch = reply.content ? reply.content.match(/@([a-zA-Z0-9_]+)/) : null;
                                    const mentionedUsername = mentionMatch ? mentionMatch[1] : null;
                                    
                                    // Nếu có @mention trong nội dung, hiển thị username từ @mention
                                    // Nếu không, hiển thị username của comment gốc
                                    const displayUsername = mentionedUsername || 
                                      (comment.user?.username || (comment.user_id ? getUserInfo(comment.user_id).username : 'Unknown'));
                                    
                                    return (
                                      <span className="text-blue-500 font-semibold mr-1">@{displayUsername}</span>
                                    );
                                  })()}
                                  {Array.isArray(reply.stickers) && reply.stickers.length > 0 ? (
                                    <div className="inline-flex items-center gap-2">
                                      {reply.stickers.map((st, idx) => (
                                        <img key={idx} src={st} alt={`Sticker ${idx}`} className="h-12 w-12" />
                                      ))}
                                      {reply.content && <span className="text-xs">{renderCommentContent(reply.content, true)}</span>}
                                    </div>
                                  ) : reply.sticker ? (
                                    <img src={reply.sticker} alt="Sticker" className="h-12 w-12 inline-block align-middle" />
                                  ) : (
                                    <span className="text-xs align-middle">{renderCommentContent(reply.content, true)}</span>
                                  )}
                                </div>
                              </div>

                          {/* Hiển thị form trả lời dưới reply comment nếu đang trả lời reply này */}
                          {isAuthenticated && replyingToReply && replyingToReply.commentId === comment.id && replyingToReply.replyId === reply.id && (
                            <div className="mt-3 ml-0 w-full">
                              <form onSubmit={handleSubmitComment}>
                                <div className={`${theme === "dark" ? "bg-gray-700" : "bg-gray-200"} p-2 mb-2 rounded flex justify-between items-center w-full`}>
                                  <div className="text-sm">
                                    Đang trả lời <span className="font-semibold text-blue-500">{reply.user ? reply.user.username : (reply.user_id ? getUserInfo(reply.user_id).username : "Unknown")}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={cancelReply}
                                    className={`${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                  </button>
                                </div>
                                <div
                                  className={`w-full ${theme === "dark" ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-800"} rounded p-3 focus:outline-none focus:ring-1 focus:ring-red-500 min-h-[60px] relative ${theme === "dark" ? "" : "border border-gray-300"}`}
                                  contentEditable
                                  ref={replyToReplyCommentInputRef}
                                  onInput={handleInput}
                                  suppressContentEditableWarning={true}
                                  onFocus={() => {
                                    setIsReplyFocused(true);
                                  }}
                                  onBlur={onBlurHandler}
                                >
                                  {commentHtml === "" && !isReplyFocused && <span className={`${theme === "dark" ? "text-gray-400" : "text-gray-500"} absolute left-3 top-3 opacity-70 pointer-events-none`}>Viết trả lời của bạn...</span>}
                                </div>
                                <div className="mt-2 flex justify-between items-center">
                                  <div className="flex space-x-2">
                                    <div className="relative" ref={stickerPickerRef}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowStickerPicker(!showStickerPicker);
                                          setShowGifPicker(false);
                                        }}
                                        className={`${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} ${theme === 'dark' ? 'text-white' : 'text-gray-800'} p-2 rounded`}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.536 5.879a1 1 0 001.414 0 3 3 0 014.242 0 1 1 0 001.414-1.414 5 5 0 00-7.07 0 1 1 0 000 1.414z" clipRule="evenodd" />
                                        </svg>
                                      </button>
                                      {showStickerPicker && (
                                        <div className={`block p-2 ${theme === 'dark' ? 'bg-gray-700' : 'bg-white border border-gray-200'} rounded shadow-lg grid grid-cols-4 gap-2`}>
                                          {/* Stickers */}
                                          <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742760.png')} className={`p-1 ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'} rounded`}>
                                            <Image
                                              src="https://cdn-icons-png.flaticon.com/128/742/742760.png"
                                              alt="Sticker 1"
                                              width={32}
                                              height={32}
                                              className="w-8 h-8"
                                            />
                                          </button>
                                          <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742751.png')} className={`p-1 ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'} rounded`}>
                                            <img src="https://cdn-icons-png.flaticon.com/128/742/742751.png" alt="Sticker 2" className="w-8 h-8" />
                                          </button>
                                          <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742784.png')} className={`p-1 ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'} rounded`}>
                                            <img src="https://cdn-icons-png.flaticon.com/128/742/742784.png" alt="Sticker 3" className="w-8 h-8" />
                                          </button>
                                          <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742750.png')} className={`p-1 ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'} rounded`}>
                                            <img src="https://cdn-icons-png.flaticon.com/128/742/742750.png" alt="Sticker 4" className="w-8 h-8" />
                                          </button>
                                          <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742745.png')} className={`p-1 ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'} rounded`}>
                                            <img src="https://cdn-icons-png.flaticon.com/128/742/742745.png" alt="Sticker 5" className="w-8 h-8" />
                                          </button>
                                          <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742821.png')} className={`p-1 ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'} rounded`}>
                                            <img src="https://cdn-icons-png.flaticon.com/128/742/742821.png" alt="Sticker 6" className="w-8 h-8" />
                                          </button>
                                          <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742752.png')} className={`p-1 ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'} rounded`}>
                                            <img src="https://cdn-icons-png.flaticon.com/128/742/742752.png" alt="Sticker 7" className="w-8 h-8" />
                                          </button>
                                          <button type="button" onClick={() => handleSelectSticker('https://cdn-icons-png.flaticon.com/128/742/742920.png')} className={`p-1 ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'} rounded`}>
                                            <img src="https://cdn-icons-png.flaticon.com/128/742/742920.png" alt="Sticker 8" className="w-8 h-8" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="relative" ref={gifPickerRef}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowGifPicker(!showGifPicker);
                                          setShowStickerPicker(false);
                                        }}
                                        className={`${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} ${theme === 'dark' ? 'text-white' : 'text-gray-800'} p-2 rounded`}
                                      >
                                        <span className="font-bold">GIF</span>
                                      </button>
                                      
                                      {showGifPicker && (
                                        <div className={`block p-2 ${theme === 'dark' ? 'bg-gray-700' : 'bg-white border border-gray-200'} rounded shadow-lg absolute z-50 bottom-full left-0 mb-2 w-[300px]`}>
                                          {/* GIF Search */}
                                          <div className="mb-2">
                                            <input
                                              type="text"
                                              placeholder="Tìm kiếm GIF..."
                                              value={gifSearchTerm}
                                              onChange={(e) => setGifSearchTerm(e.target.value)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                  e.preventDefault();
                                                  fetchGifs(selectedCategory, gifSearchTerm);
                                                }
                                              }}
                                              className={`w-full p-2 rounded ${theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-800'} mb-2`}
                                            />
                                          </div>

                                          {/* GIF Categories */}
                                          <div className="flex mb-2 space-x-2 flex-wrap gap-y-2">
                                            <button
                                              onClick={() => {
                                                setSelectedCategory("trending");
                                                fetchGifs("trending", gifSearchTerm);
                                              }}
                                              className={`px-2 py-1 rounded text-xs ${selectedCategory === "trending"
                                                ? 'bg-red-600 text-white'
                                                : theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                                            >
                                              Xu hướng
                                            </button>
                                            <button
                                              onClick={() => {
                                                setSelectedCategory("qoobee");
                                                fetchGifs("qoobee", gifSearchTerm);
                                              }}
                                              className={`px-2 py-1 rounded text-xs ${selectedCategory === "qoobee"
                                                ? 'bg-red-600 text-white'
                                                : theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                                            >
                                              Qoobee
                                            </button>
                                            <button
                                              onClick={() => {
                                                setSelectedCategory("capoo");
                                                fetchGifs("capoo", gifSearchTerm);
                                              }}
                                              className={`px-2 py-1 rounded text-xs ${selectedCategory === "capoo"
                                                ? 'bg-red-600 text-white'
                                                : theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                                            >
                                              Capoo
                                            </button>
                                            <button
                                              onClick={() => {
                                                setSelectedCategory("pepe");
                                                fetchGifs("pepe", gifSearchTerm);
                                              }}
                                              className={`px-2 py-1 rounded text-xs ${selectedCategory === "pepe"
                                                ? 'bg-red-600 text-white'
                                                : theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                                            >
                                              Pepe
                                            </button>
                                            <button
                                              onClick={() => {
                                                setSelectedCategory("onion");
                                                fetchGifs("onion", gifSearchTerm);
                                              }}
                                              className={`px-2 py-1 rounded text-xs ${selectedCategory === "onion"
                                                ? 'bg-red-600 text-white'
                                                : theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                                            >
                                              Onion Head
                                            </button>
                                            <button
                                              onClick={() => {
                                                setSelectedCategory("anime");
                                                fetchGifs("anime", gifSearchTerm);
                                              }}
                                              className={`px-2 py-1 rounded text-xs ${selectedCategory === "anime"
                                                ? 'bg-red-600 text-white'
                                                : theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                                            >
                                              Anime
                                            </button>
                                            <button
                                              onClick={() => {
                                                setSelectedCategory("reactions");
                                                fetchGifs("reactions", gifSearchTerm);
                                              }}
                                              className={`px-2 py-1 rounded text-xs ${selectedCategory === "reactions"
                                                ? 'bg-red-600 text-white'
                                                : theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                                            >
                                              Biểu cảm
                                            </button>
                                          </div>

                                          {/* GIF Results */}
                                          <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                                            {gifResults.map((gif, index) => (
                                              <div
                                                key={index}
                                                className="cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => handleSelectGif(gif)}
                                              >
                                                <img src={gif} alt={`GIF ${index}`} className="w-full h-auto rounded" />
                                              </div>
                                            ))}
                                            {gifResults.length === 0 && (
                                              <div className="col-span-2 text-center py-4 text-sm text-gray-500">
                                                Không tìm thấy GIF nào
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <button
                                    type="submit"
                                    disabled={isSubmitting || ((!commentHtml.trim() || !commentInputRef.current?.textContent?.trim()) && selectedStickers.length === 0)}
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
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className={`text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-sm`}>Chưa có bình luận nào. Hãy là người đầu tiên bình luận!</p>
            )}
        </div>
      </div>

      {/* Error Report Dialog */}
      <ErrorReportDialog
        isOpen={isErrorReportOpen}
        onClose={() => setIsErrorReportOpen(false)}
        mangaId={mangaId}
        chapterId={chapterId}
        chapterNumber={chapter?.number}
      />
    </div>
  );
}
