/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "../../../../components/admin/AdminSidebar";
import Link from "next/link";
import { mangaApi, genreApi } from "../../../../services/api";
import { useRouter } from "next/navigation";
import React from "react";

export default function CreateManga() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [author, setAuthor] = useState("");
  const [artist, setArtist] = useState("");
  const [releaseYear, setReleaseYear] = useState("");
  const [status, setStatus] = useState("ongoing");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [imageSource, setImageSource] = useState<"file" | "url">("file");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Fetch available genres from API
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const data = await genreApi.getGenres();
        if (data && data.length > 0) {
          setAvailableGenres(data.map((genre: any) => genre.name));
        } else {
          // Fallback to default genres
          setAvailableGenres([
            "Action",
            "Adventure",
            "Comedy",
            "Drama",
            "Fantasy",
            "Horror",
            "Mystery",
            "Romance",
            "Sci-Fi",
            "Slice of Life",
            "Sports",
            "Supernatural",
          ]);
        }
      } catch (err) {
        console.error("Failed to fetch genres:", err);
        // Fallback to default genres
        setAvailableGenres([
          "Action",
          "Adventure",
          "Comedy",
          "Drama",
          "Fantasy",
          "Horror",
          "Mystery",
          "Romance",
          "Sci-Fi",
          "Slice of Life",
          "Sports",
          "Supernatural",
        ]);
      }
    };

    fetchGenres();
  }, []);

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      setCoverImageUrl("");
      setImageSource("file");
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setCoverImageUrl(url);
    setCoverImage(null);
    setImageSource("url");
    setCoverImagePreview(url);
  };

  const handleGenreChange = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : [...prev, genre]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!title || !description || !author || !(coverImage || coverImageUrl)) {
      setError("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    if (selectedGenres.length === 0) {
      setError("Vui lòng chọn ít nhất một thể loại");
      return;
    }

    setIsLoading(true);

    try {
      // Tạo FormData để gửi dữ liệu bao gồm file
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("author", author);

      if (artist) {
        formData.append("artist", artist);
      }

      if (releaseYear) {
        formData.append("releaseYear", releaseYear);
      }

      formData.append("status", status);

      // Thêm ảnh bìa từ file hoặc URL
      if (imageSource === "file" && coverImage) {
        formData.append("cover_image", coverImage);
      } else if (imageSource === "url" && coverImageUrl) {
        formData.append("remote_cover_image_url", coverImageUrl);
        formData.append("use_remote_url", "1");
      }

      // Thêm genres
      selectedGenres.forEach((genre) => {
        formData.append("genres[]", genre);
      });

      // Gọi API để tạo manga mới
      const newManga = await mangaApi.createManga(formData);

      setSuccess(true);
      // Reset form
      setTitle("");
      setDescription("");
      setAuthor("");
      setArtist("");
      setReleaseYear("");
      setStatus("ongoing");
      setCoverImage(null);
      setCoverImagePreview("");
      setCoverImageUrl("");
      setImageSource("file");
      setSelectedGenres([]);

      // Chuyển hướng đến trang chi tiết manga sau 2 giây
      setTimeout(() => {
        router.push(`/admin/mangas/${newManga.id}`);
      }, 2000);
    } catch (err) {
      console.error("Error creating manga:", err);
      setIsLoading(false);
      setError("Tạo truyện thất bại. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-900">
      <AdminSidebar />

      <main className="flex-1 p-6">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold mb-2">Thêm truyện mới</h1>
            <Link
              href="/admin/mangas"
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
            >
              Quay lại
            </Link>
          </div>
          <p className="text-gray-400">Điền thông tin để thêm truyện mới vào hệ thống</p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-100 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-900/50 border border-green-500 text-green-100 px-4 py-3 rounded-lg mb-6">
            Tạo truyện mới thành công! Đang chuyển hướng...
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-2">
                  Tên truyện <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập tên truyện"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-2">
                  Mô tả <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập mô tả truyện"
                  rows={6}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="author" className="block text-sm font-medium mb-2">
                    Tác giả <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="author"
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập tên tác giả"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="artist" className="block text-sm font-medium mb-2">
                    Họa sĩ
                  </label>
                  <input
                    id="artist"
                    type="text"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập tên họa sĩ"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="releaseYear" className="block text-sm font-medium mb-2">
                    Năm phát hành
                  </label>
                  <input
                    id="releaseYear"
                    type="number"
                    value={releaseYear}
                    onChange={(e) => setReleaseYear(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập năm phát hành"
                    min="1900"
                    max={new Date().getFullYear()}
                  />
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium mb-2">
                    Trạng thái
                  </label>
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ongoing">Đang tiến hành</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="hiatus">Tạm ngưng</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Thể loại <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {availableGenres.map((genre) => (
                    <div key={genre} className="flex items-center">
                      <input
                        id={`genre-${genre}`}
                        type="checkbox"
                        checked={selectedGenres.includes(genre)}
                        onChange={() => handleGenreChange(genre)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded"
                      />
                      <label htmlFor={`genre-${genre}`} className="ml-2 block text-sm">
                        {genre}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Ảnh bìa <span className="text-red-500">*</span>
              </label>

              <div className="mb-4">
                <div className="flex space-x-4 mb-4">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="upload-file"
                      name="image-source"
                      checked={imageSource === "file"}
                      onChange={() => setImageSource("file")}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded"
                    />
                    <label htmlFor="upload-file" className="ml-2 block text-sm">
                      Tải lên từ máy tính
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="upload-url"
                      name="image-source"
                      checked={imageSource === "url"}
                      onChange={() => setImageSource("url")}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded"
                    />
                    <label htmlFor="upload-url" className="ml-2 block text-sm">
                      Sử dụng URL hình ảnh
                    </label>
                  </div>
                </div>

                {imageSource === "url" && (
                  <div className="mb-4">
                    <input
                      type="text"
                      value={coverImageUrl}
                      onChange={handleImageUrlChange}
                      placeholder="Nhập URL hình ảnh"
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center">
                {coverImagePreview ? (
                  <div className="relative aspect-[2/3] mb-2">
                    <img
                      src={coverImagePreview}
                      alt="Cover preview"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCoverImage(null);
                        setCoverImagePreview("");
                        setCoverImageUrl("");
                        setImageSource("file");
                      }}
                      className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="py-8">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <p className="mt-2 text-sm text-gray-400">
                      Nhấn để tải lên hoặc kéo thả file ảnh
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      PNG, JPG, GIF tối đa 5MB
                    </p>
                  </div>
                )}
                <input
                  id="cover-image"
                  type="file"
                  accept="image/*"
                  onChange={handleCoverImageChange}
                  className="hidden"
                />
                <label
                  htmlFor="cover-image"
                  className="mt-2 cursor-pointer inline-flex items-center px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {coverImagePreview ? "Thay đổi ảnh" : "Chọn ảnh"}
                </label>
              </div>
            </div>
          </div>

          <div className="mt-8 text-right">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center ml-auto"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Đang xử lý...
                </>
              ) : (
                "Tạo truyện mới"
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
