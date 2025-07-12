/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
// import Image from "next/image";
import Link from "next/link";
import { mangaApi, genreApi } from "../services/api";
import React from "react";

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

export default function Home() {
  const [featuredManga, setFeaturedManga] = useState<Manga | null>(null);
  const [popularMangas, setPopularMangas] = useState<Manga[]>([]);
  const [latestUpdates, setLatestUpdates] = useState<Manga[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("latest");
  const [activeRanking, setActiveRanking] = useState<'day' | 'week' | 'month'>('day');

  // Define rankings with proper typing
  const [rankings, setRankings] = useState<{
    day: Manga[];
    week: Manga[];
    month: Manga[];
  }>({
    day: [],
    week: [],
    month: []
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch popular mangas
        const popularData = await mangaApi.getMangas({
          sort: "popularity",
          limit: 12
        });
        const mappedPopular = popularData.mangas.map((m: { cover_image: { url: any; }; }) => ({
          ...m,
          coverImage: m.cover_image?.url
        }));
        setPopularMangas(mappedPopular);

        // Fetch latest updates
        const latestUpdates = await mangaApi.getMangas({
          sort: "updatedAt",
          limit: 20
        });
        const mappedLatest = latestUpdates.mangas.map((m: { cover_image: { url: any; }; }) => ({
          ...m,
          coverImage: m.cover_image?.url ?? ""
        }));
        setLatestUpdates(mappedLatest);

        // Set featured manga (first popular manga)
        if (popularData.mangas && popularData.mangas.length > 0) {
          const featured = await mangaApi.getManga(popularData.mangas[0].id);
          setFeaturedManga({
            ...featured,
            coverImage: featured.cover_image?.url,
          });
        }

        // Fetch genres
        try {
          const genresData = await genreApi.getGenres();
          setGenres(genresData || []);
        } catch (err) {
          console.error("Failed to fetch genres:", err);
        }

        // Fetch rankings data for each time period
        try {
          const [dayRankings, weekRankings, monthRankings] = await Promise.all([
            mangaApi.getRankings('day', 6),
            mangaApi.getRankings('week', 6),
            mangaApi.getRankings('month', 6)
          ]);

          // Map the data to our format
          const mapRankingData = (data: any[]) => data.map((m: any) => ({
            ...m,
            coverImage: m.cover_image?.url,
            id: m.id,
            title: m.title,
            slug: m.slug,
            view_count: m.view_count,
            chapter: m.latest_chapter?.number || m.chapters_count || 0,
            latestChapter: m.latest_chapter?.number || m.chapters_count || 0
          }));

          setRankings({
            day: mapRankingData(dayRankings.mangas || []),
            week: mapRankingData(weekRankings.mangas || []),
            month: mapRankingData(monthRankings.mangas || [])
          });
        } catch (err) {
          console.error("Failed to fetch rankings:", err);

          // Fallback to using popular mangas as rankings if API fails
          setRankings({
            day: mappedPopular.slice(0, 6),
            week: mappedPopular.slice(0, 6).sort(() => Math.random() - 0.5),
            month: mappedPopular.slice(0, 6).sort(() => Math.random() - 0.5)
          });
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setError("Không thể tải dữ liệu. Vui lòng thử lại sau.");

        // Fallback to mock data
        setFeaturedManga({
          id: 1,
          title: "One Piece",
          coverImage: "https://m.media-amazon.com/images/I/51FVFCrSp0L._AC_UF1000,1000_QL80_.jpg",
          description:
            "Gol D. Roger, vua hải tặc với khối tài sản vô giá One Piece, đã bị xử tử. Trước khi chết, ông tiết lộ rằng kho báu của mình được giấu ở Grand Line. Monkey D. Luffy, một cậu bé với ước mơ trở thành vua hải tặc, vô tình ăn phải trái ác quỷ Gomu Gomu, biến cơ thể cậu thành cao su. Giờ đây, cậu cùng các đồng đội hải tặc mũ rơm bắt đầu cuộc hành trình tìm kiếm kho báu One Piece.",
        });

        // Add mock ranking data
        const mockMangas = [
          {
            id: 1,
            title: "One Piece",
            coverImage: "https://m.media-amazon.com/images/I/51FVFCrSp0L._AC_UF1000,1000_QL80_.jpg",
            latestChapter: 1088,
            view_count: 15000000,
          },
          {
            id: 2,
            title: "Naruto",
            coverImage: "https://m.media-amazon.com/images/I/71QYLrc-IQL._AC_UF1000,1000_QL80_.jpg",
            latestChapter: 700,
            view_count: 12000000,
          },
          {
            id: 3,
            title: "Jujutsu Kaisen",
            coverImage: "https://m.media-amazon.com/images/I/81TmHlRleJL._AC_UF1000,1000_QL80_.jpg",
            latestChapter: 223,
            view_count: 8000000,
          },
          {
            id: 4,
            title: "Demon Slayer",
            coverImage: "https://m.media-amazon.com/images/I/81ZNkhqRvVL._AC_UF1000,1000_QL80_.jpg",
            latestChapter: 205,
            view_count: 9500000,
          },
          {
            id: 5,
            title: "My Hero Academia",
            coverImage: "https://m.media-amazon.com/images/I/51FZ6JzhBEL._AC_UF1000,1000_QL80_.jpg",
            latestChapter: 402,
            view_count: 7800000,
          },
          {
            id: 6,
            title: "Attack on Titan",
            coverImage: "https://m.media-amazon.com/images/I/91M9VaZWxOL._AC_UF1000,1000_QL80_.jpg",
            latestChapter: 139,
            view_count: 11000000,
          },
        ];

        setRankings({
          day: [...mockMangas].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)),
          week: [...mockMangas].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)),
          month: [...mockMangas].sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Danh sách thể loại mặc định
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
        <p className="text-red-500 mb-4">{error}</p>
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
        {(activeTab === "latest" ? latestUpdates : popularMangas).map((manga) => (
          <div key={manga.id} className="group">
            <Link href={`/manga/${manga.slug || manga.id}`} className="block">
              <div className="relative aspect-[2/3] rounded overflow-hidden mb-2 bg-gray-800">
                {/* <Image
                  src={manga.coverImage}
                  alt={manga.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                /> */}
                <img
                  src={manga.coverImage}
                  alt={manga.title}
                  className="object-cover w-full h-full"
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
          {rankings[activeRanking].map((manga, index) => (
            <div key={manga.id} className="group">
              <Link href={`/manga/${manga.slug || manga.id}`} className="block">
                <div className="relative aspect-[2/3] rounded overflow-hidden mb-2 bg-gray-800">
                  {/* Ranking number badge */}
                  <div className="absolute top-0 right-0 bg-gray-900/80 text-red-500 font-bold px-2 py-1 text-sm z-10">
                    #{index + 1}
                  </div>

                  <img
                    src={manga.coverImage || "/placeholder-manga.jpg"}
                    alt={manga.title}
                    className="object-cover w-full h-full"
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
          {(genres.length > 0 ? genres : defaultGenres).map((genre) => (
            <Link
              key={genre.id}
              href={`/genres/${genre.name.toLowerCase()}`}
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
