/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
// import Image from "next/image";
import Link from "next/link";
// import { mangaApi } from "../../../services/api";
import { useAuth } from "../../../hooks/useAuth";
import { useTheme } from "../../../hooks/useTheme";
// import { userApi } from "../../../services/api";
import React from "react";
import { useManga, useFavoriteStatus, useUserRating, mangaAPI, userAPI } from "../../../services/swrApi";

// interface Chapter {
//   id: number;
//   number: number;
//   title: string;
//   created_at: string;  // Changed from createdAt to created_at
//   view_count?: number;
//   slug?: string;
// }

// interface Manga {
//   id: number;
//   title: string;
//   description: string;
//   coverImage: string | { url: string; thumb?: any; small?: any };
//   author: string;
//   artist?: string;
//   status: string;
//   releaseYear?: number;
//   genres: string[];
//   chapters: Chapter[];
//   view_count?: number;
//   rating?: number;
//   totalVotes?: number;
//   total_votes?: number;
//   translationTeam?: string;
//   slug?: string;
// }

type Props = {
  params: Promise<{ id: string }>;
};

export default function MangaDetail(props: Props) {
  // Trích xuất id từ params và lưu vào biến riêng để tránh cảnh báo
  const { id: mangaId } = React.use(props.params);
  const { isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const [isFavorite, setIsFavorite] = useState(false);
  const [userRating, setUserRating] = useState<number>(0);
  const [isRating, setIsRating] = useState(false);
  const [hoverRating, setHoverRating] = useState<number>(0);

  // Sử dụng SWR hooks
  const { data: mangaData, error: mangaError, isLoading: mangaLoading, mutate: refreshManga } = useManga(mangaId);
  const { data: favoriteData } = useFavoriteStatus(mangaId, isAuthenticated);
  const { data: userRatingData } = useUserRating(mangaId, isAuthenticated, {
    onError: () => {
      // Reset user rating on error (user hasn't rated this manga)
      setUserRating(0);
    }
  });

  // Xử lý dữ liệu manga
  const manga = mangaData ? {
    ...mangaData,
    totalVotes: mangaData.total_votes || mangaData.totalVotes || 0,
    chapters: mangaData.chapters ? [...mangaData.chapters].sort(
      (a: { number: number; }, b: { number: number; }) => b.number - a.number
    ) : []
  } : null;

  // Cập nhật trạng thái favorite khi dữ liệu thay đổi
  useEffect(() => {
    if (favoriteData) {
      setIsFavorite(favoriteData.is_favorite);
    }
  }, [favoriteData]);

  // Cập nhật user rating khi dữ liệu thay đổi
  useEffect(() => {
    if (userRatingData && userRatingData.rating) {
      setUserRating(userRatingData.rating);
    }
  }, [userRatingData]);

  const toggleFavorite = async () => {
    if (!isAuthenticated) {
      alert("Vui lòng đăng nhập để thêm truyện vào danh sách yêu thích");
      return;
    }

    try {
      // Đảm bảo sử dụng ID số
      const numericId = manga?.id || (mangaId && !isNaN(Number(mangaId)) ? parseInt(mangaId) : null);

      if (!numericId) {
        throw new Error('Không thể xác định ID manga');
      }

      // Sử dụng hàm toggleFavorite từ userAPI
      await userAPI.toggleFavorite(numericId);

      // Cập nhật trạng thái UI
      setIsFavorite(!isFavorite);

      // Làm mới dữ liệu favorite
      const favoriteKey = `/v1/users/favorites/check/${numericId}`;
      const mutate = (window as any).SWRGlobalState?.get('_key')?.get(favoriteKey)?.get(1)?.mutate;
      if (mutate) {
        mutate();
      }
    } catch (error) {
      console.error('Lỗi khi thêm/xóa yêu thích:', error);
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

      // Đảm bảo sử dụng ID số
      const numericId = manga?.id || (mangaId && !isNaN(Number(mangaId)) ? parseInt(mangaId) : null);

      if (!numericId) {
        throw new Error('Không thể xác định ID manga');
      }

      // Sử dụng hàm rateManga từ mangaAPI
      await mangaAPI.rateManga(numericId, rating);

      // Set the user rating immediately
      setUserRating(rating);

      // Refresh manga data to get updated ratings
      refreshManga();
    } catch (error) {
      console.error('Lỗi khi đánh giá:', error);
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

  // Fallback manga data khi có lỗi
  // const fallbackManga = {
  //   id: parseInt(mangaId),
  //   title: "One Piece",
  //   description: "Gol D. Roger, vua hải tặc với khối tài sản vô giá One Piece, đã bị xử tử. Trước khi chết, ông tiết lộ rằng kho báu của mình được giấu ở Grand Line. Monkey D. Luffy, một cậu bé với ước mơ trở thành vua hải tặc, vô tình ăn phải trái ác quỷ Gomu Gomu, biến cơ thể cậu thành cao su. Giờ đây, cậu cùng các đồng đội hải tặc mũ rơm bắt đầu cuộc hành trình tìm kiếm kho báu One Piece.",
  //   coverImage: {url:"https://m.media-amazon.com/images/I/51FVFCrSp0L._AC_UF1000,1000_QL80_.jpg" },
  //   author: "Eiichiro Oda",
  //   status: "ongoing",
  //   releaseYear: 1999,
  //   genres: ["Action", "Adventure", "Comedy", "Fantasy", "Shounen", "Super Power"],
  //   chapters: [
  //     {
  //       id: 1,
  //       number: 1088,
  //       title: "Cuộc chiến cuối cùng",
  //       created_at: "2023-08-10",
  //       view_count: 150000,
  //     },
  //     {
  //       id: 2,
  //       number: 1087,
  //       title: "Luffy vs Kaido",
  //       created_at: "2023-08-03",
  //       view_count: 145000,
  //     },
  //     {
  //       id: 3,
  //       number: 1086,
  //       title: "Bí mật của Laugh Tale",
  //       created_at: "2023-07-27",
  //       view_count: 140000,
  //     },
  //   ],
  //   view_count: 15000000,
  // };

  if (mangaLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (mangaError || !manga) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500 mb-4">{mangaError?.message || "Không tìm thấy truyện"}</p>
        <Link href="/" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">
          Quay lại trang chủ
        </Link>
      </div>
    );
  }

  // Phần còn lại của component giữ nguyên
  return (
    <div className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
      {/* Manga Info Section */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'} rounded-lg overflow-hidden mb-6`}>
        <div className="md:flex gap-6 p-6">
          {/* Left Column */}
          <div className="md:w-1/4">
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-4">
            <img
              src={manga.coverImage || manga.cover_image?.url || manga.cover_image_url || (typeof manga.cover_image === 'string' ? manga.cover_image : null) || "/placeholder-manga.jpg"}
              alt={manga.title}
              className="object-cover w-full h-full"
            />
            </div>

            {/* Rating Section */}
            <div className={`${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-200/70'} rounded-lg p-4 mb-4`}>
              {renderRatingStars()}
              <div className="text-center">
                {/* Display the rating value */}
                <span className="text-xl font-bold">
                  {/* Always show the manga's overall rating */}
                  {Number(manga.rating || 0).toFixed(1)}
                </span>
                <span className="text-sm"> / 5</span>
                <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} text-sm block`}>
                  của {manga.totalVotes || manga.total_votes || 0} lượt đánh giá
                </span>
                {isAuthenticated && userRating > 0 && (
                  <span className="text-sm text-yellow-500 mt-2 block">
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
                  isFavorite ? "bg-yellow-600 hover:bg-yellow-700" : theme === 'dark' ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-300 hover:bg-gray-400"
                } text-white`}>
                {isFavorite ? "Đã yêu thích" : "Thêm vào yêu thích"}
              </button>
            </div>
          </div>

          {/* Right Column */}
          <div className="md:w-3/4 mt-6 md:mt-0">
            <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>{manga.title}</h1>

            {/* Stats Row */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center">
                <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Nhóm dịch:</span>
                <span className="ml-2">{manga.translationTeam || "Chưa có"}</span>
              </div>
              <div className="flex items-center">
                <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Lượt xem:</span>
                <span className="ml-2">{manga.view_count?.toLocaleString() || 0}</span>
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
                <span className={`${theme === 'dark' ? 'bg-gray-700 text-gray-100' : 'bg-gray-300 text-gray-800'} px-2 py-1 rounded text-xs flex items-center`}>
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
              <h2 className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-2`}>Thể loại:</h2>
              <div className="flex flex-wrap gap-2">
                {manga.genres && manga.genres.map((genre: { name?: string; title?: string; id?: number | string; } | null | undefined, index: React.Key | null | undefined) => {
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
                      className={`${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} px-2 py-1 rounded text-xs`}
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
                <div className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Tác giả:</div>
                <div className="col-span-2">{manga.author}</div>

                {manga.artist && (
                  <>
                    <div className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Họa sĩ:</div>
                    <div className="col-span-2">{manga.artist}</div>
                  </>
                )}

                {manga.releaseYear && (
                  <>
                    <div className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Năm phát hành:</div>
                    <div className="col-span-2">{manga.releaseYear}</div>
                  </>
                )}

                <div className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Số chương:</div>
                <div className="col-span-2">{manga.chapters.length}</div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-4">
              <h2 className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-2`}>Mô tả:</h2>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>{manga.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chapter List Section */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'} rounded-lg p-4`}>
        <h2 className={`text-xl font-bold mb-4 pb-2 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>Danh sách chương</h2>

        <div className="space-y-2">
          {manga.chapters.map((chapter: { id: React.Key | null | undefined; slug: any; number: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; title: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; view_count: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; created_at: string | number | Date; }) => (
            <Link
              key={chapter.id}
              href={`/manga/${manga.slug || manga.id}/chapter/${chapter.slug || chapter.id}`}
              className={`flex justify-between items-center p-3 ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} rounded transition-colors`}
            >
              <div>
                <span className="font-medium">Chapter {chapter.number}</span>
                {chapter.title && <span className={`ml-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>- {chapter.title}</span>}
              </div>
              <div className={`flex items-center space-x-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {/* Hiển thị view_count nếu có */}
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
