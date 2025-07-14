"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminSidebar from "../../../../../../components/admin/AdminSidebar";
import { chapterApi, proxyApi } from "../../../../../../services/api";
import React from "react";

type Props = {
  params: Promise<{ id: string }>;
};

export default function CreateChapter(props: Props) {
  const router = useRouter();
  const { id: mangaId } = use(props.params);

  const [title, setTitle] = useState("");
  const [number, setNumber] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagesPreviews, setImagesPreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [externalImages, setExternalImages] = useState<{url: string}[]>([]);

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: File[] = [];
    const newPreviews: string[] = [];

    // Convert FileList to array and sort by filename
    const filesArray = Array.from(files).sort((a, b) => {
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });

    // Process each file
    filesArray.forEach(file => {
      newImages.push(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        if (newPreviews.length === filesArray.length) {
          setImagesPreviews([...imagesPreviews, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    setImages([...images, ...newImages]);
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    const newPreviews = [...imagesPreviews];
    const newExternalImages = [...externalImages];

    // Check if this is a normal uploaded image or an external image
    if (index < images.length) {
      // It's a normal uploaded image
      newImages.splice(index, 1);
      newPreviews.splice(index, 1);
    } else {
      // It's an external image
      const externalIndex = index - images.length;
      newExternalImages.splice(externalIndex, 1);
      newPreviews.splice(index, 1);
    }

    setImages(newImages);
    setExternalImages(newExternalImages);
    setImagesPreviews(newPreviews);
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === imagesPreviews.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    // Determine if we're moving uploaded images or external images
    const isSourceUploaded = index < images.length;
    const isTargetUploaded = targetIndex < images.length;

    // Create copies of all arrays
    const newImages = [...images];
    const newPreviews = [...imagesPreviews];
    const newExternalImages = [...externalImages];

    // Swap previews (this always happens)
    const tempPreview = newPreviews[index] as string;
    newPreviews[index] = newPreviews[targetIndex] as string;
    newPreviews[targetIndex] = tempPreview;

    if (isSourceUploaded && isTargetUploaded) {
      // Both are uploaded images, swap in images array
      const tempImage = newImages[index];
      if (tempImage && newImages[targetIndex]) {
        newImages[index] = newImages[targetIndex];
        newImages[targetIndex] = tempImage;
      }
    } else if (!isSourceUploaded && !isTargetUploaded) {
      // Both are external images, swap in externalImages array
      const sourceExternalIndex = index - images.length;
      const targetExternalIndex = targetIndex - images.length;
      const tempExternalImage = newExternalImages[sourceExternalIndex];
      if (tempExternalImage && newExternalImages[targetExternalIndex]) {
        newExternalImages[sourceExternalIndex] = newExternalImages[targetExternalIndex];
        newExternalImages[targetExternalIndex] = tempExternalImage;
      }
    } else {
      // One is uploaded, one is external - need to move between arrays
      if (isSourceUploaded) {
        // Moving from uploaded to external
        const sourceImage = newImages[index];
        const targetExternalIndex = targetIndex - images.length;
        const targetExternalImage = newExternalImages[targetExternalIndex];

        // Create File from external URL (dummy operation for preview only)
        const dummyFile = new File([], "external_image.jpg");

        // Remove from source and add to target
        if (sourceImage) {
          newImages.splice(index, 1);
          newImages.splice(targetIndex, 0, dummyFile);
        }

        // Update external images
        if (targetExternalImage) {
          newExternalImages.splice(targetExternalIndex, 1);
        }
        // We'd need the actual URL here, but for simplicity we're just reordering the previews
      } else {
        // Moving from external to uploaded
        const sourceExternalIndex = index - images.length;
        const sourceExternalImage = newExternalImages[sourceExternalIndex];
        const targetImage = newImages[targetIndex];

        // Remove from source and add to target
        if (sourceExternalImage) {
          newExternalImages.splice(sourceExternalIndex, 1);
        }
        // We'd need to convert the File to URL here, but for simplicity we're just reordering the previews
      }
    }

    setImages(newImages);
    setExternalImages(newExternalImages);
    setImagesPreviews(newPreviews);
  };

  // Handle importing images from URL
  const handleImportFromUrl = async () => {
    if (!importUrl) {
      setError("Vui lòng nhập URL chapter");
      return;
    }

    setIsImporting(true);
    setError("");

    try {
      // Phân tích URL để xác định nguồn và định dạng
      const url = new URL(importUrl);
      const hostname = url.hostname;
      const pathname = url.pathname;

      // Mảng chứa URL ảnh sẽ import
      let imageUrls: string[] = [];

      // Kiểm tra xem URL có phải là URL ảnh trực tiếp không
      if (pathname.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
        console.log("Detected direct image URL");
        // Nếu là URL ảnh trực tiếp, thêm vào danh sách
        imageUrls.push(importUrl);

        // Nếu URL có dạng số tuần tự như 001.jpg, thử tìm các ảnh tiếp theo
        const sequentialPattern = importUrl.match(/(.*\/)(\d+)(\.[a-zA-Z]+)$/);
        if (sequentialPattern && sequentialPattern[1] && sequentialPattern[2] && sequentialPattern[3]) {
          const baseUrl = sequentialPattern[1];  // https://img.pixelimg.net/ba-chi-chu-nha/chapter-1/
          const numberPart = sequentialPattern[2]; // 001
          const extension = sequentialPattern[3];  // .jpg
          const digits = numberPart.length;
          const startNumber = parseInt(numberPart);

          console.log(`Detected sequential pattern: ${baseUrl}${numberPart}${extension}`);
          console.log(`Base URL: ${baseUrl}, Number: ${startNumber}, Digits: ${digits}, Extension: ${extension}`);

          // Thử tìm các ảnh tiếp theo trong chuỗi
          for (let i = startNumber + 1; i < startNumber + 50; i++) {
            // Format số với đúng số chữ số (padding)
            const formattedNumber = i.toString().padStart(digits, '0');
            const nextUrl = `${baseUrl}${formattedNumber}${extension}`;

            // Thêm vào danh sách
            imageUrls.push(nextUrl);
          }
        }
      } else if (hostname.includes('nettruyen')) {
        // Xử lý cho NetTruyen - không cần proxy
        // Format: /manga/ten-truyen/chapter-X hoặc /truyen-tranh/ten-truyen/chapter-X
        const chapterMatch = pathname.match(/(?:chapter|chuong)-(\d+)/i);
        if (!chapterMatch) {
          throw new Error("Không thể xác định số chapter từ URL");
        }

        const chapterNum = chapterMatch[1];
        console.log("Detected chapter number:", chapterNum);

        // Thử lấy ảnh từ trang web
        try {
          // Giả lập request để lấy HTML của trang - dùng fetch trực tiếp
          const response = await fetch(importUrl);
          const html = await response.text();

          // Tìm tất cả các URL ảnh trong HTML
          const imgRegex = /<img[^>]+(?:src|data-src|data-original)="([^">]+)"[^>]*>/g;
          const allImageUrls = new Set<string>();
          let match;

          // Tìm ảnh từ các thuộc tính src, data-src, data-original
          while ((match = imgRegex.exec(html)) !== null) {
            const imgSrc = match[1];
            // Bỏ qua các ảnh rõ ràng không phải ảnh chapter
            if (imgSrc && typeof imgSrc === 'string' &&
                !imgSrc.includes('logo') &&
                !imgSrc.includes('banner') &&
                !imgSrc.includes('icon') &&
                !imgSrc.includes('tmp/0.png') &&
                !imgSrc.includes('tmp/1.png') &&
                !imgSrc.includes('tmp/2.png') &&
                !imgSrc.includes('ads') &&
                !imgSrc.includes('facebook') &&
                !imgSrc.includes('fbcdn') &&
                !imgSrc.includes('avatar') &&
                !imgSrc.includes('thumbnail')) {
              // Chuẩn hóa URL và chuyển đổi kiểu
              const normalizedUrl = imgSrc.split('?')[0] as string;
              allImageUrls.add(normalizedUrl);
            }
          }

          // Lọc ra các ảnh chapter thực sự
          if (allImageUrls.size > 0) {
            // Tìm pattern phổ biến cho URL ảnh chapter
            const urlPatterns = [
              `/ch/${chapterNum}/`,
              `/chapter-${chapterNum}/`,
              `/chuong-${chapterNum}/`,
              `/chap-${chapterNum}/`,
              `/ch-${chapterNum}/`,
              `/${chapterNum}.`,
              `/${chapterNum}-`,
              'ntcdn',
              'netcdn',
              'truyenvua.com',
              'nettruyen',
              'truyenqq'
            ];

            // Lọc ảnh theo pattern
            const filteredUrls = Array.from(allImageUrls).filter(url => {
              // Lọc bỏ các ảnh từ mạng xã hội, quảng cáo và ảnh tạm
              if (url.includes('facebook') ||
                  url.includes('fbcdn') ||
                  url.includes('ads') ||
                  url.includes('banner') ||
                  url.includes('logo') ||
                  url.includes('icon') ||
                  url.includes('avatar') ||
                  url.includes('tmp/0.png') ||
                  url.includes('tmp/1.png') ||
                  url.includes('tmp/2.png') ||
                  url.includes('thumbnail')) {
                return false;
              }

              // Ưu tiên các ảnh có pattern của chapter
              for (const pattern of urlPatterns) {
                if (url.includes(pattern)) {
                  return true;
                }
              }

              // Nếu không tìm thấy pattern cụ thể, kiểm tra xem có phải ảnh lớn không
              return (url.includes('.webp') ||
                      url.includes('.jpg') ||
                      url.includes('.png')) &&
                     !url.includes('thumbnail') &&
                     !url.includes('small');
            });

            // Nếu tìm được ảnh, thêm vào danh sách
            imageUrls = filteredUrls;
          }
        } catch (err) {
          console.error("Error fetching page HTML:", err);
          throw new Error("Không thể tải nội dung từ trang web");
        }
      } else {
        // Xử lý chung cho các trang web khác - thử fetch trực tiếp trước, nếu lỗi CORS thì dùng proxy
        try {
          // Thử fetch trực tiếp trước
          let html;
          try {
            const response = await fetch(importUrl);
            html = await response.text();
          } catch (directFetchError) {
            console.log("Direct fetch failed, trying proxy:", directFetchError);
            // Nếu fetch trực tiếp lỗi, dùng proxy
            html = await proxyApi.fetchUrl(importUrl);
          }

          // Tìm tất cả các URL ảnh trong HTML
          const imgRegex = /<img[^>]+(?:src|data-src|data-original)="([^">]+)"[^>]*>/g;
          const allImageUrls = new Set<string>();
          let match;

          while ((match = imgRegex.exec(html)) !== null) {
            const imgSrc = match[1];
            // Lọc bỏ các ảnh logo, banner, icon
            if (typeof imgSrc === 'string' && !imgSrc.includes('logo') && !imgSrc.includes('banner') && !imgSrc.includes('icon')) {
              // Chuyển đổi URL tương đối thành tuyệt đối nếu cần
              if (imgSrc.startsWith('/')) {
                allImageUrls.add(`${url.protocol}//${url.host}${imgSrc}`);
              } else if (!imgSrc.startsWith('http')) {
                allImageUrls.add(`${url.protocol}//${url.host}/${imgSrc}`);
              } else {
                allImageUrls.add(imgSrc);
              }
            }
          }

          // Lọc các ảnh có kích thước lớn (có thể là ảnh chapter)
          imageUrls = Array.from(allImageUrls).filter(url =>
            !url.includes('avatar') &&
            !url.includes('thumbnail') &&
            !url.includes('small') &&
            !url.includes('facebook') &&
            !url.includes('fbcdn') &&
            !url.includes('ads') &&
            (url.includes('.jpg') ||
             url.includes('.jpeg') ||
             url.includes('.png') ||
             url.includes('.webp') ||
             url.includes('.gif'))
          );
        } catch (err) {
          console.error("Error fetching page HTML:", err);
          throw new Error("Không thể tải nội dung từ trang web");
        }
      }

      // Nếu không tìm thấy ảnh nào, thử tìm URL ảnh trực tiếp trong input
      if (imageUrls.length === 0) {
        // Kiểm tra xem input có chứa URL ảnh không
        const directImageUrlMatch = importUrl.match(/(https?:\/\/[^"\s]+\.(jpg|jpeg|png|webp|gif))/i);
        if (directImageUrlMatch) {
          const directImageUrl = directImageUrlMatch[0];
          imageUrls.push(directImageUrl);
        } else {
          throw new Error("Không tìm thấy ảnh nào từ URL này");
        }
      }

      // Loại bỏ các URL trùng lặp
      imageUrls = Array.from(new Set(imageUrls));

      // Thêm URLs vào danh sách ảnh
      const newExternalImages = [...externalImages];
      const newPreviews = [...imagesPreviews];

      for (const url of imageUrls) {
        newExternalImages.push({ url });
        newPreviews.push(url);
      }

      setExternalImages(newExternalImages);
      setImagesPreviews(newPreviews);
      setImportUrl("");
      setSuccess(true);
    } catch (error) {
      console.error("Lỗi khi import ảnh:", error);
      setError(error instanceof Error ? error.message : "Lỗi khi import ảnh từ URL");
    } finally {
      setIsImporting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!title || !number) {
      setError("Vui lòng nhập tiêu đề và số chapter");
      return;
    }

    if (images.length === 0 && externalImages.length === 0) {
      setError("Vui lòng tải lên hoặc import ít nhất một ảnh cho chapter");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("number", number);

      // Append each image
      images.forEach(image => {
        formData.append('images[]', image);
      });

      // Append each external image URL
      externalImages.forEach(image => {
        formData.append('external_image_urls[]', image.url);
      });

      // Create chapter - API sẽ xử lý cả images và external_image_urls
      await chapterApi.createChapter(mangaId, formData);

      setSuccess(true);

      // Reset form
      setTitle("");
      setNumber("");
      setImages([]);
      setImagesPreviews([]);
      setExternalImages([]);

      // Redirect to manga detail after 2 seconds
      setTimeout(() => {
        router.push(`/admin/mangas/${mangaId}`);
      }, 2000);
    } catch (err) {
      console.error("Failed to create chapter:", err);
      setError("Tạo chapter thất bại. Vui lòng thử lại sau.");
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
            <h1 className="text-3xl font-bold mb-2">Thêm chapter mới</h1>
            <Link
              href={`/admin/mangas/${mangaId}`}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
            >
              Quay lại
            </Link>
          </div>
          <p className="text-gray-400">Thêm chapter mới cho truyện</p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-100 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-900/50 border border-green-500 text-green-100 px-4 py-3 rounded-lg mb-6">
            Tạo chapter mới thành công!
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-2">
                Tiêu đề <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập tiêu đề chapter"
                required
              />
            </div>

            <div>
              <label htmlFor="number" className="block text-sm font-medium mb-2">
                Số chapter <span className="text-red-500">*</span>
              </label>
              <input
                id="number"
                type="number"
                step="0.1"
                min="0"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập số chapter (ví dụ: 1, 1.5, 2)"
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Ảnh chapter <span className="text-red-500">*</span>
            </label>
            <p className="text-sm text-gray-400 mb-2">
              Tải lên các ảnh cho chapter. Các ảnh sẽ được hiển thị theo thứ tự tải lên.
              Bạn có thể sắp xếp lại thứ tự sau khi tải lên.
            </p>

            <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center">
              <input
                id="chapter-images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImagesChange}
                className="hidden"
              />
              <label
                htmlFor="chapter-images"
                className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Chọn ảnh
              </label>
              <p className="mt-1 text-xs text-gray-500">
                PNG, JPG, GIF, WEBP tối đa 5MB mỗi ảnh
              </p>
            </div>
          </div>

          {/* Import ảnh từ URL */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Import ảnh từ URL</h3>
            <p className="text-sm text-gray-400 mb-2">
              Nhập URL chapter từ các trang web truyện như nettruyen, truyenvn, v.v. để import tất cả ảnh của chapter đó
            </p>

            <div className="flex gap-4">
              <input
                type="text"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="Ví dụ: https://nettruyen1905.com/manga/ten-truyen/chapter-1 hoặc URL ảnh trực tiếp"
                className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleImportFromUrl}
                disabled={isImporting}
                className={`px-6 py-3 rounded-lg text-white ${
                  isImporting
                    ? "bg-blue-700 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-500"
                }`}
              >
                {isImporting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang import...
                  </span>
                ) : (
                  "Import ảnh"
                )}
              </button>
            </div>
          </div>

          {imagesPreviews.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Ảnh đã chọn ({imagesPreviews.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {imagesPreviews.map((preview, index) => (
                  <div key={index} className="relative bg-gray-700 rounded-lg p-2">
                    <div className="aspect-[2/3] relative">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-contain rounded"
                      />
                      <div className="absolute top-0 left-0 bg-gray-800 text-white text-xs px-2 py-1 rounded-br">
                        {index + 1}
                      </div>
                    </div>

                    <div className="flex justify-between mt-2">
                      <div className="space-x-1">
                        <button
                          type="button"
                          onClick={() => moveImage(index, 'up')}
                          disabled={index === 0}
                          className={`p-1 rounded ${
                            index === 0 ? 'text-gray-500' : 'text-blue-400 hover:bg-gray-600'
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => moveImage(index, 'down')}
                          disabled={index === imagesPreviews.length - 1}
                          className={`p-1 rounded ${
                            index === imagesPreviews.length - 1 ? 'text-gray-500' : 'text-blue-400 hover:bg-gray-600'
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="p-1 text-red-400 hover:bg-gray-600 rounded"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg font-medium flex items-center justify-center"
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
                  Đang tạo...
                </>
              ) : (
                "Tạo chapter"
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
