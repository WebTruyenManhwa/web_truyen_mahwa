"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import { useParams } from "next/navigation";
import React from "react";
import { useTheme } from "../../../hooks/useTheme";
import ThemeToggle from "../../../components/ThemeToggle";

interface NovelSeries {
  id: number;
  title: string;
  author: string;
  description: string;
  cover_image: string;
  status: string;
  slug: string;
  chapters_count: number;
  created_at: string;
  updated_at: string;
}

interface NovelChapter {
  id: number;
  title: string;
  chapter_number: number;
  slug: string;
  created_at: string;
}

interface ApiResponse {
  novel_series: NovelSeries;
  chapters: NovelChapter[];
}

export default function NovelSeriesDetailPage() {
  const { theme } = useTheme();
  const params = useParams();
  const slug = params.slug as string;
  const [novel, setNovel] = useState<NovelSeries | null>(null);
  const [chapters, setChapters] = useState<NovelChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchNovelDetails = async () => {
      setLoading(true);
      try {
        const response = await axios.get<ApiResponse>(
          `${process.env.NEXT_PUBLIC_API_URL}/v1/novel_series/${slug}`
        );
        setNovel(response.data.novel_series);
        setChapters(response.data.chapters);
      } catch (err) {
        setError("Có lỗi xảy ra khi tải dữ liệu truyện chữ.");
        console.error("Error fetching novel details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNovelDetails();
  }, [slug]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ongoing":
        return "Đang tiến hành";
      case "completed":
        return "Hoàn thành";
      case "hiatus":
        return "Tạm ngưng";
      default:
        return "Không xác định";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ongoing":
        return "bg-blue-600";
      case "completed":
        return "bg-green-600";
      case "hiatus":
        return "bg-yellow-600";
      default:
        return "bg-gray-600";
    }
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

  if (error || !novel) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-500 text-white p-4 rounded-lg mb-8">
          {error || "Không tìm thấy truyện chữ."}
        </div>
        <Link
          href="/novel-series"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Quay lại danh sách truyện chữ
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-4">
        <Link
          href="/novel-series"
          className="text-blue-500 hover:underline flex items-center"
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
          Quay lại danh sách truyện chữ
        </Link>
        <ThemeToggle className="px-3 py-2" />
      </div>

      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white border border-gray-200'} rounded-lg overflow-hidden`}>
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row">
            <div className="w-full md:w-1/4 mb-6 md:mb-0">
              <div className="relative h-96 md:h-80 rounded-lg overflow-hidden">
                <img
                  src={novel.cover_image || "/placeholder-novel.jpg"}
                  alt={novel.title}
                  className="w-full h-full object-cover"
                />
                <div
                  className={`absolute top-2 right-2 ${getStatusColor(
                    novel.status
                  )} text-white text-xs px-2 py-1 rounded-full`}
                >
                  {getStatusLabel(novel.status)}
                </div>
              </div>
            </div>

            <div className="w-full md:w-3/4 md:pl-8">
              <h1 className="text-3xl font-bold mb-2">{novel.title}</h1>
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-4`}>Tác giả: {novel.author}</p>

              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Giới thiệu</h2>
                <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} whitespace-pre-line`}>{novel.description}</p>
              </div>

              <div className={`grid grid-cols-2 gap-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                <div>
                  <span className="font-semibold">Số chương:</span> {novel.chapters_count}
                </div>
                <div>
                  <span className="font-semibold">Trạng thái:</span> {getStatusLabel(novel.status)}
                </div>
                <div>
                  <span className="font-semibold">Ngày đăng:</span> {formatDate(novel.created_at)}
                </div>
                <div>
                  <span className="font-semibold">Cập nhật:</span> {formatDate(novel.updated_at)}
                </div>
              </div>

              {chapters.length > 0 && (
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Link
                    href={`/novel-series/${novel.slug}/${chapters[0].slug || chapters[0].id}`}
                    className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Đọc từ đầu
                  </Link>
                  <Link
                    href={`/novel-series/${novel.slug}/${chapters[chapters.length - 1].slug || chapters[chapters.length - 1].id}`}
                    className="w-full sm:w-auto px-6 py-3 bg-gray-700 text-white text-center rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Đọc chương mới nhất
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Danh sách chương</h2>
        {chapters.length === 0 ? (
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white border border-gray-200'} p-6 rounded-lg text-center`}>
            <p>Chưa có chương nào.</p>
          </div>
        ) : (
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white border border-gray-200'} rounded-lg overflow-hidden`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-4">
              {chapters.map((chapter) => (
                <Link
                  key={chapter.id}
                  href={`/novel-series/${novel.slug}/${chapter.slug || chapter.id}`}
                  className={`p-3 ${
                    theme === 'dark'
                      ? 'bg-gray-700 hover:bg-gray-600'
                      : 'bg-gray-100 hover:bg-gray-200'
                  } rounded-lg transition-colors`}
                >
                  <div className="flex justify-between items-center">
                    <span>
                      Chương {chapter.chapter_number}: {chapter.title}
                    </span>
                    <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatDate(chapter.created_at)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
