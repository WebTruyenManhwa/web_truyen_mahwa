/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, use } from "react";
// import Image from "next/image";
import Link from "next/link";
import { mangaApi } from "../../../services/api";
import { useAuth } from "../../../hooks/useAuth";
import { userApi } from "../../../services/api";
import React from "react";

interface Chapter {
  id: number;
  number: number;
  title: string;
  created_at: string;  // Changed from createdAt to created_at
  view_count?: number;
  slug?: string;
}

interface Manga {
  id: number;
  title: string;
  description: string;
  coverImage: string | { url: string; thumb?: any; small?: any };
  author: string;
  artist?: string;
  status: string;
  releaseYear?: number;
  genres: string[];
  chapters: Chapter[];
  view_count?: number;
  rating?: number;
  totalVotes?: number;
  total_votes?: number;
  translationTeam?: string;
  slug?: string;
}

type Props = {
  params: Promise<{ id: string }>;
};

export default function MangaDetail(props: Props) {
  // Trích xuất id từ params và lưu vào biến riêng để tránh cảnh báo
  const { id: mangaId } = use(props.params);
  const { isAuthenticated } = useAuth();
  const [manga, setManga] = useState<Manga | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [userRating, setUserRating] = useState<number>(0);
  const [isRating, setIsRating] = useState(false);
  const [hoverRating, setHoverRating] = useState<number>(0);

  useEffect(() => {
    const fetchManga = async () => {
      try {
        setIsLoading(true);
        // Always use noCache=true to ensure we get the latest data
        const timestamp = Date.now();
        console.log("Fetching manga data with timestamp:", timestamp);
        const data = await mangaApi.getManga(mangaId, true);
        // Log the raw data from the API
        console.log("Raw API response:", data);

        const normalized = {
          ...data,
          coverImage: data.cover_image?.url ?? '',
          // Make sure we use the correct property name for total_votes
          totalVotes: data.total_votes || data.totalVotes || 0,
        };

        // Sắp xếp chapters
        if (normalized.chapters) {
          normalized.chapters = normalized.chapters.sort(
            (a: { number: number; }, b: { number: number; }) => b.number - a.number
          );
        }

        setManga(normalized);

        // Kiểm tra xem manga có trong danh sách yêu thích không và lấy đánh giá của người dùng
        if (isAuthenticated) {
          try {
            // Use the numeric ID from the fetched manga data
            const numericId = normalized.id;

            // Check if manga is in favorites
            const favorites = await mangaApi.checkFavorite(numericId);
            setIsFavorite(favorites.is_favorite);

            // Also fetch the user's rating for this manga
            try {
              const userRatingData = await mangaApi.getUserRating(numericId);
              if (userRatingData && userRatingData.rating) {
                setUserRating(userRatingData.rating);
              } else {
                // Reset user rating if they haven't rated this manga
                setUserRating(0);
              }
            } catch (ratingErr) {
              console.error("Failed to fetch user rating:", ratingErr);
              // Reset user rating on error
              setUserRating(0);
            }
          } catch (err) {
            console.error("Failed to check favorite status:", err);
          }
        } else {
          // Reset user rating when not authenticated
          setUserRating(0);
        }
      } catch (err) {
        console.error("Failed to fetch manga:", err);
        setError("Không thể tải thông tin truyện. Vui lòng thử lại sau.");

        // Fallback to mock data
        setManga({
          id: parseInt(mangaId),
          title: "One Piece",
          description: "Gol D. Roger, vua hải tặc với khối tài sản vô giá One Piece, đã bị xử tử. Trước khi chết, ông tiết lộ rằng kho báu của mình được giấu ở Grand Line. Monkey D. Luffy, một cậu bé với ước mơ trở thành vua hải tặc, vô tình ăn phải trái ác quỷ Gomu Gomu, biến cơ thể cậu thành cao su. Giờ đây, cậu cùng các đồng đội hải tặc mũ rơm bắt đầu cuộc hành trình tìm kiếm kho báu One Piece.",
          coverImage: {url:"https://m.media-amazon.com/images/I/51FVFCrSp0L._AC_UF1000,1000_QL80_.jpg" },
          author: "Eiichiro Oda",
          status: "ongoing",
          releaseYear: 1999,
          genres: ["Action", "Adventure", "Comedy", "Fantasy", "Shounen", "Super Power"],
          chapters: [
            {
              id: 1,
              number: 1088,
              title: "Cuộc chiến cuối cùng",
              created_at: "2023-08-10",
              view_count: 150000,
            },
            {
              id: 2,
              number: 1087,
              title: "Luffy vs Kaido",
              created_at: "2023-08-03",
              view_count: 145000,
            },
            {
              id: 3,
              number: 1086,
              title: "Bí mật của Laugh Tale",
              created_at: "2023-07-27",
              view_count: 140000,
            },
          ],
          view_count: 15000000,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchManga();
  }, [mangaId, isAuthenticated]);

  // Add a useEffect to log rating data when it changes
  useEffect(() => {
    if (manga) {
      console.log("Manga rating data:", manga.rating, manga.totalVotes || manga.total_votes);
    }
  }, [manga?.rating, manga?.totalVotes, manga?.total_votes]);

  const toggleFavorite = async () => {
    if (!isAuthenticated) {
      alert("Vui lòng đăng nhập để thêm truyện vào danh sách yêu thích");
      return;
    }

    try {
      // Ensure we're using the numeric ID, not the slug
      const numericId = manga?.id || parseInt(mangaId);
      await userApi.toggleFavorite(numericId);
      setIsFavorite(!isFavorite);
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
      alert("Không thể thực hiện. Vui lòng thử lại sau.");
    }
  };

  const handleRate = async (rating: number) => {
    if (!isAuthenticated) {
      alert("Vui lòng đăng nhập để đánh giá");
      return;
    }

    try {
      setIsRating(true);
      // Ensure we're using the numeric ID, not the slug
      const numericId = manga?.id || parseInt(mangaId);
      console.log("Submitting rating:", rating, "for manga ID:", numericId);
      const response = await mangaApi.rateManga(numericId, rating);

      console.log("Rating response:", response);

      // Set the user rating immediately
      setUserRating(rating);

      // Update the manga with the new overall rating data from the response
      setManga(prev => {
        if (!prev) return null;

        console.log("Updating manga with new rating data:", response.rating, response.totalVotes || response.total_votes);

        return {
          ...prev,
          // Use the overall rating from the response, not the user's personal rating
          rating: response.rating,
          totalVotes: response.totalVotes || response.total_votes,
          total_votes: response.totalVotes || response.total_votes
        };
      });

      // Fetch fresh data from the server to ensure we have the latest rating
      try {
        console.log("Fetching fresh data after rating");
        const freshData = await mangaApi.getManga(numericId, true);
        console.log("Fresh data after rating:", freshData);

        if (freshData) {
          const normalized = {
            ...freshData,
            coverImage: freshData.cover_image?.url ?? '',
            totalVotes: freshData.total_votes || freshData.totalVotes || 0,
          };

          // Preserve the chapters sorting
          if (normalized.chapters && manga?.chapters) {
            normalized.chapters = normalized.chapters.sort(
              (a: { number: number; }, b: { number: number; }) => b.number - a.number
            );
          }

          // Keep the user's rating when updating the manga data
          setManga(normalized);
        }
      } catch (refreshErr) {
        console.error("Failed to refresh manga data:", refreshErr);
        // We already updated the UI with the response data, so no need for additional handling
      }
    } catch (err) {
      console.error("Failed to rate manga:", err);
      alert("Không thể đánh giá. Vui lòng thử lại sau.");
    } finally {
      setIsRating(false);
    }
  };

  const renderRatingStars = () => {
    return (
      <div className="flex justify-center mb-2">
        {[1, 2, 3, 4, 5].map((star) => {
          // For half stars, we need to check if the rating is at least star-0.5
          const isHalfStar = manga?.rating && manga.rating >= star - 0.5 && manga.rating < star;

          return (
            <button
              key={star}
              onClick={() => handleRate(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              disabled={isRating}
              className={`text-2xl transition-colors duration-200 ${
                isRating ? 'cursor-not-allowed opacity-50' :
                hoverRating >= star ? 'text-yellow-400' :
                // When hovering or after rating, show the user's rating
                userRating >= star ? 'text-yellow-400' :
                // Otherwise show the manga's overall rating
                manga?.rating && manga.rating >= star ? 'text-yellow-400' :
                isHalfStar ? 'text-yellow-200' : 'text-gray-600'
              } hover:text-yellow-400`}
            >
              ★
            </button>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (error || !manga) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500 mb-4">{error || "Không tìm thấy truyện"}</p>
        <Link href="/" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">
          Quay lại trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Manga Info Section */}
      <div className="bg-gray-800 rounded-lg overflow-hidden mb-6">
        <div className="md:flex gap-6 p-6">
          {/* Left Column */}
          <div className="md:w-1/4">
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-4">
            <img
              src={typeof manga.coverImage === 'string'
                ? manga.coverImage
                : manga.coverImage?.url ?? "/placeholder-manga.jpg"
              }
              alt={manga.title}
              className="object-cover"
            />
            </div>

            {/* Rating Section */}
            <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
              {renderRatingStars()}
              <div className="text-center text-gray-300">
                {/* Display the rating value */}
                <span className="text-xl font-bold">
                  {/* Always show the manga's overall rating */}
                  {Number(manga.rating || 0).toFixed(1)}
                </span>
                <span className="text-sm"> / 5</span>
                <span className="text-gray-400 text-sm block">
                  của {manga.totalVotes || manga.total_votes || 0} lượt đánh giá
                </span>
                {isAuthenticated && userRating > 0 && (
                  <span className="text-sm text-yellow-400 mt-2 block">
                    Bạn đã đánh giá: {userRating}/5
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Link href={`/manga/${manga.slug || manga.id}/chapter/${manga.chapters[manga.chapters.length - 1]?.slug || manga.chapters[manga.chapters.length - 1]?.id || 1}`}
                  className="block bg-blue-600 hover:bg-blue-700 text-white text-center py-2 rounded">
                  Chap đầu
                </Link>
                <Link href={`/manga/${manga.slug || manga.id}/chapter/${manga.chapters[0]?.slug || manga.chapters[0]?.id || 1}`}
                  className="block bg-red-600 hover:bg-red-700 text-white text-center py-2 rounded">
                  Chap cuối
                </Link>
              </div>
              <button onClick={toggleFavorite}
                className={`block w-full text-center py-2 rounded ${
                  isFavorite ? "bg-yellow-600 hover:bg-yellow-700" : "bg-gray-700 hover:bg-gray-600"
                } text-white`}>
                {isFavorite ? "Đã yêu thích" : "Thêm vào yêu thích"}
              </button>
            </div>
          </div>

          {/* Right Column */}
          <div className="md:w-3/4 mt-6 md:mt-0">
            <h1 className="text-3xl font-bold text-white mb-4">{manga.title}</h1>

            {/* Stats Row */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center">
                <span className="text-gray-400">Nhóm dịch:</span>
                <span className="ml-2 text-white">{manga.translationTeam || "Chưa có"}</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-400">Lượt xem:</span>
                <span className="ml-2 text-white">{manga.view_count?.toLocaleString() || 0}</span>
              </div>
            </div>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-2 mb-4">
              {manga.status && (
                <span className="bg-blue-900 text-blue-100 px-2 py-1 rounded text-xs">
                  {manga.status === "ongoing" ? "Đang tiến hành" :
                   manga.status === "completed" ? "Hoàn thành" :
                   manga.status === "hiatus" ? "Tạm ngưng" : "Đã hủy"}
                </span>
              )}

              {manga.view_count && (
                <span className="bg-gray-700 text-gray-100 px-2 py-1 rounded text-xs flex items-center">
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

            {/* Genres */}
            <div className="mb-4">
              <h2 className="text-sm text-gray-400 mb-2">Thể loại:</h2>
              <div className="flex flex-wrap gap-2">
                {manga.genres && manga.genres.map((genre, index) => {
                  // Xử lý genre dựa trên kiểu dữ liệu
                  let genreName = '';

                  if (typeof genre === 'object' && genre !== null) {
                    // Sử dụng type assertion để TypeScript biết cấu trúc của đối tượng
                    const genreObj = genre as { name?: string; title?: string; id?: number | string };
                    genreName = genreObj.name || genreObj.title || String(genreObj.id || index);
                  } else if (genre === null || genre === undefined) {
                    // Nếu là null hoặc undefined, dùng giá trị mặc định
                    genreName = `genre-${index}`;
                  } else {
                    // Các trường hợp khác (string, number)
                    genreName = String(genre);
                  }

                  // Tạo slug an toàn cho URL
                  const slug = genreName.toLowerCase()
                    .replace(/[^\w\s-]/g, '') // Loại bỏ ký tự đặc biệt
                    .replace(/\s+/g, '-')     // Thay khoảng trắng bằng dấu gạch ngang
                    || `genre-${index}`;      // Fallback nếu slug rỗng

                  return (
                    <Link
                      key={index}
                      href={`/genres/${slug}`}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
                    >
                      {genreName}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Info Table */}
            <div className="mb-4">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-gray-400">Tác giả:</div>
                <div className="col-span-2">{manga.author}</div>

                {manga.artist && (
                  <>
                    <div className="text-gray-400">Họa sĩ:</div>
                    <div className="col-span-2">{manga.artist}</div>
                  </>
                )}

                {manga.releaseYear && (
                  <>
                    <div className="text-gray-400">Năm phát hành:</div>
                    <div className="col-span-2">{manga.releaseYear}</div>
                  </>
                )}

                <div className="text-gray-400">Số chương:</div>
                <div className="col-span-2">{manga.chapters.length}</div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-4">
              <h2 className="text-sm text-gray-400 mb-2">Mô tả:</h2>
              <p className="text-sm text-gray-300 leading-relaxed">{manga.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chapter List Section */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-xl font-bold mb-4 pb-2 border-b border-gray-700">Danh sách chương</h2>

        <div className="space-y-2">
          {manga.chapters.map((chapter) => (
            <Link
              key={chapter.id}
              href={`/manga/${manga.slug || manga.id}/chapter/${chapter.slug || chapter.id}`}
              className="flex justify-between items-center p-3 hover:bg-gray-700 rounded transition-colors"
            >
              <div>
                <span className="font-medium">Chapter {chapter.number}</span>
                {chapter.title && <span className="ml-2 text-gray-400">- {chapter.title}</span>}
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-400">
                {/* Xóa console.log và hiển thị view_count nếu có */}
                {typeof chapter.view_count === 'number' && (
                  <span className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1"
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
                    {chapter.view_count >= 1000
                      ? `${(chapter.view_count / 1000).toFixed(0)}K`
                      : chapter.view_count}
                  </span>
                )}
                <span>{new Date(chapter.created_at).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
