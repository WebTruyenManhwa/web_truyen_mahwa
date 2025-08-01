/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../hooks/useAuth";

interface Comment {
  id: number;
  content: string;
  sticker?: string;
  stickers?: string[];
  createdAt?: string;
  created_at?: string;
  has_replies?: boolean;
  replies?: Comment[];
  user?: {
    id: number;
    username: string;
    avatar?: string;
  };
  user_id?: number;
  parent_id?: number;
  commentable_type?: string;
  commentable_id?: number;
  updated_at?: string;
}

interface ChapterCommentsProps {
  mangaId: string;
  chapterId: string;
  theme: string;
  comments: Comment[];
  totalComments: number;
  onLoadComments: () => void;
  formatTimeAgo: (dateString: string | undefined) => string;
  handleSubmitComment: (e: React.FormEvent) => Promise<void>;
  commentHtml: string;
  setCommentHtml: (html: string) => void;
}

export default function ChapterComments({
  mangaId,
  chapterId,
  theme,
  comments,
  totalComments,
  onLoadComments,
  formatTimeAgo,
  handleSubmitComment,
  commentHtml,
  setCommentHtml
}: ChapterCommentsProps) {
  const { isAuthenticated } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [isMainCommentFocused, setIsMainCommentFocused] = useState(false);
  const commentInputRef = useRef<HTMLDivElement>(null);
  
  // Đọc trạng thái hiển thị bình luận từ localStorage khi component mount
  useEffect(() => {
    const savedShowComments = localStorage.getItem('showComments');
    if (savedShowComments !== null) {
      setShowComments(savedShowComments === 'true');
    }
  }, []);
  
  // Lưu trạng thái hiển thị bình luận vào localStorage khi thay đổi
  useEffect(() => {
    localStorage.setItem('showComments', showComments.toString());
    
    // Khi bật hiển thị bình luận, gọi hàm tải bình luận
    if (showComments) {
      onLoadComments();
    }
  }, [showComments, onLoadComments]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    setCommentHtml((e.target as HTMLDivElement).innerHTML);
  };

  const onBlurHandler = () => {
    setTimeout(() => {
      setIsMainCommentFocused(false);
    }, 100);
  };

  return (
    <div className="mt-8">
      <h2 className={`text-xl font-bold mb-4 pb-2 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'} flex items-center justify-between`}>
        <div>
          Bình luận
          <span className="ml-2 text-sm font-normal text-gray-500">({totalComments})</span>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="show-comments"
            checked={showComments}
            onChange={(e) => setShowComments(e.target.checked)}
            className="mr-2 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
          />
          <label htmlFor="show-comments" className="text-sm font-normal cursor-pointer">
            Hiển thị bình luận
          </label>
        </div>
      </h2>
      
      {showComments && (
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white border border-gray-200'} rounded p-4`}>
          {/* Form bình luận tổng luôn ở đầu */}
          {isAuthenticated ? (
            <div className="mb-4">
              <form id="comment-form" onSubmit={handleSubmitComment}>
                <div
                  ref={commentInputRef}
                  className={`w-full ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'} rounded p-3 focus:outline-none focus:ring-1 focus:ring-red-500 min-h-[60px] relative ${theme === 'dark' ? '' : 'border border-gray-300'}`}
                  contentEditable
                  onInput={handleInput}
                  suppressContentEditableWarning={true}
                  onFocus={() => setIsMainCommentFocused(true)}
                  onBlur={onBlurHandler}
                >
                  {commentHtml === "" && !isMainCommentFocused && (
                    <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} absolute left-3 top-3 opacity-70`}>
                      Viết bình luận của bạn...
                    </span>
                  )}
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <div className="flex space-x-2">
                    {/* Sticker và GIF buttons */}
                  </div>
                  <button
                    type="submit"
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                  >
                    Gửi bình luận
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className={`mb-4 p-3 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'} rounded text-center ${theme === 'dark' ? '' : 'border border-gray-300'}`}>
              <p>Vui lòng <Link href="/auth/login" className="text-red-400 hover:underline">đăng nhập</Link> để bình luận</p>
            </div>
          )}
          
          {/* Danh sách bình luận */}
          {comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className={`mb-4 p-3 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'} rounded ${theme === 'dark' ? '' : 'border border-gray-300'}`}>
                <div className="flex items-start">
                  <div className="flex-shrink-0 mr-3">
                    {/* Avatar */}
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center mb-1">
                      <span className="font-bold">{comment.user?.username}</span>
                      <span className="ml-2 text-xs text-gray-500">{formatTimeAgo(comment.created_at || comment.createdAt)}</span>
                    </div>
                    <div className="mb-2">
                      {/* Comment content */}
                    </div>
                    {/* Reply button */}
                  </div>
                </div>
                {/* Replies */}
              </div>
            ))
          ) : (
            <p className={`text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-sm`}>Chưa có bình luận nào. Hãy là người đầu tiên bình luận!</p>
          )}
        </div>
      )}
    </div>
  );
} 