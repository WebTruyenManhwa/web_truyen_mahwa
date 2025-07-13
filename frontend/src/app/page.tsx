/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
// import Image from "next/image";
import Link from "next/link";
// import { mangaApi, genreApi } from "../services/api";
import React from "react";
import useSWR from 'swr';

interface Manga {
  id: number;
  title: string;
  coverImage?: string;
  description?: string;
  latestChapter?: number;
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

// API base URL từ environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Hàm fetcher cho SWR
const fetcher = async (url: string) => {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  const response = await fetch(fullUrl);
  if (!response.ok) {
    throw new Error('An error occurred while fetching the data.');
  }
  return response.json();
};

// Hàm tạo key cho cache đã được tích hợp trực tiếp trong các lời gọi SWR
// Nếu cần sử dụng riêng, có thể uncomment lại
/*
const createCacheKey = (endpoint: string, params?: Record<string, any>) => {
  let key = endpoint;
  if (params) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });
    const queryString = queryParams.toString();
    if (queryString) {
      key += `?${queryString}`;
    }
  }
  return key;
};
*/

export default function Home() {
  const [activeTab, setActiveTab] = useState("latest");
  const [activeRanking, setActiveRanking] = useState<'day' | 'week' | 'month'>('day');

  // Sử dụng SWR để fetch và cache data
  const { data: popularData, error: popularError, isLoading: popularLoading } = useSWR(
    '/v1/mangas?sort=popularity&limit=12',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 } // Cache trong 5 phút
  );

  const { data: latestData, error: latestError, isLoading: latestLoading } = useSWR(
    '/v1/mangas?sort=updatedAt&limit=20',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  const { data: genresData } = useSWR(
    '/v1/genres',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 3600000 } // Cache trong 1 giờ
  );

  const { data: dayRankings } = useSWR(
    '/v1/mangas/rankings/day?limit=6',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 600000 } // Cache trong 10 phút
  );

  const { data: weekRankings } = useSWR(
    '/v1/mangas/rankings/week?limit=6',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 1800000 } // Cache trong 30 phút
  );

  const { data: monthRankings } = useSWR(
    '/v1/mangas/rankings/month?limit=6',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 3600000 } // Cache trong 1 giờ
  );

  // Xử lý dữ liệu
  const popularMangas = popularData?.mangas?.map((m: any) => ({
    ...m,
    coverImage: m.cover_image?.url
  })) || [];

  const latestUpdates = latestData?.mangas?.map((m: any) => ({
    ...m,
    coverImage: m.cover_image?.url ?? ""
  })) || [];

  const featuredManga = popularMangas.length > 0 ? {
    ...popularMangas[0],
    coverImage: popularMangas[0].cover_image?.url,
  } : null;

  const genres: Genre[] = genresData || [];

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
    { id: 12, name: "Supernatural" }
  ];

  // Xử lý rankings
  const rankings = {
    day: dayRankings?.mangas || [],
    week: weekRankings?.mangas || [],
    month: monthRankings?.mangas || []
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
    <div className="space-y-8">
      {/* Hero Banner */}
      {featuredManga && (
        <section className="relative rounded-lg overflow-hidden">
          <div className="relative h-72 md:h-96">
            <img
              src={featuredManga.coverImage || "https://placehold.co/1200x800/333/white?text=No+Image"}
              alt={featuredManga.title}
              className="w-full h-full object-cover brightness-50"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full md:max-w-2xl">
              <h1 className="text-2xl md:text-3xl font-bold mb-2 text-white">{featuredManga.title}</h1>
              <p className="text-gray-300 mb-4 line-clamp-2 text-sm md:text-base">{featuredManga.description}</p>
              <Link
                href={`/manga/${featuredManga.slug || featuredManga.id}`}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium text-sm inline-block"
              >
                Đọc ngay
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-700 mb-4">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab("latest")}
            className={`py-2 px-4 font-medium text-lg ${
              activeTab === "latest"
                ? "text-red-500 border-b-2 border-red-500"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Mới cập nhật
          </button>
          <button
            onClick={() => setActiveTab("popular")}
            className={`py-2 px-4 font-medium text-lg ${
              activeTab === "popular"
                ? "text-red-500 border-b-2 border-red-500"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Phổ biến
          </button>
        </div>
      </div>

      {/* Manga Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
        {(activeTab === "latest" ? latestUpdates : popularMangas).map((manga: Manga) => (
          <div key={manga.id} className="group">
            <Link href={`/manga/${manga.slug || manga.id}`} className="block">
              <div className="relative aspect-[2/3] rounded overflow-hidden mb-2 bg-gray-800">
                <img
                  src={manga.coverImage}
                  alt={manga.title}
                  className="object-cover w-full h-full"
                  loading="lazy" // Thêm lazy loading
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                {/* Chapter Badge */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="bg-red-600 text-white px-1.5 py-0.5 rounded text-xs">
                      Ch. {manga.latestChapter || manga.chapter}
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
                </div>
              </div>
              <h3 className="font-medium text-sm line-clamp-2 group-hover:text-red-500 transition-colors">{manga.title}</h3>
            </Link>
            {manga.updatedAt && (
              <p className="text-gray-500 text-xs">
                {new Date(manga.updatedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* View More Button */}
      <div className="text-center mt-8">
        <Link
          href={activeTab === "latest" ? "/latest" : "/popular"}
          className="inline-block bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-full"
        >
          Xem thêm
        </Link>
      </div>

      {/* Top Rankings Section */}
      <section className="mt-12">
        <h2 className="text-xl font-bold mb-4 pb-2 border-b border-gray-700">Bảng xếp hạng</h2>

        <div className="flex mb-4 border-b border-gray-800">
          <button
            className={`px-4 py-2 font-medium ${activeRanking === 'day' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-400'}`}
            onClick={() => setActiveRanking('day')}
          >
            Top ngày
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeRanking === 'week' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-400'}`}
            onClick={() => setActiveRanking('week')}
          >
            Top tuần
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeRanking === 'month' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-400'}`}
            onClick={() => setActiveRanking('month')}
          >
            Top tháng
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {rankings[activeRanking].map((manga: { id: React.Key | null | undefined; slug: any; coverImage: any; title: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; latestChapter: any; chapter: any; period_views: any; view_count: any; }, index: number) => (
            <div key={manga.id} className="group">
              <Link href={`/manga/${manga.slug || manga.id}`} className="block">
                <div className="relative aspect-[2/3] rounded overflow-hidden mb-2 bg-gray-800">
                  {/* Ranking number badge */}
                  <div className="absolute top-0 right-0 bg-gray-900/80 text-red-500 font-bold px-2 py-1 text-sm z-10">
                    #{index + 1}
                  </div>

                  <img
                    src={manga.coverImage || "/placeholder-manga.jpg"}
                    alt={manga.title as string}
                    className="object-cover w-full h-full"
                    loading="lazy" // Thêm lazy loading
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                  {/* Chapter Badge */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="bg-red-600 text-white px-1.5 py-0.5 rounded text-xs">
                        Ch. {manga.latestChapter || manga.chapter || 1}
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
                  </div>
                </div>
                <h3 className="font-medium text-sm line-clamp-2 group-hover:text-red-500 transition-colors">{manga.title}</h3>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Genres Section */}
      <section className="mt-12">
        <h2 className="text-xl font-bold mb-4 pb-2 border-b border-gray-700">Thể loại</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {(genres.length > 0 ? genres : defaultGenres).map((genre: { id: React.Key | null | undefined; name: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; }) => (
            <Link
              key={genre.id}
              href={`/genres/${String(genre.name).toLowerCase()}`}
              className="bg-gray-800 hover:bg-gray-700 text-center py-3 rounded-lg transition-colors hover:text-red-500"
            >
              {genre.name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
