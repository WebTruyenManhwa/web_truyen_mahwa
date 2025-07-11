/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, use } from "react";
// import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminSidebar from "../../../../../../../components/admin/AdminSidebar";
import { chapterApi } from "../../../../../../../services/api";

// Định nghĩa interface cho ảnh chapter
interface ChapterImage {
  id: number;
  position: number;
  url: string;
  image?: string;
  image_url?: string;
  is_external?: boolean;
  external_url?: string;
}

// Định nghĩa interface cho ảnh mới
interface NewImage {
  file?: File;
  position: number;
  image_url?: string;
  is_external?: boolean;
  external_url?: string;
}

// Định nghĩa interface cho preview ảnh mới
interface NewImagePreview {
  preview: string;
  position: number;
  is_external?: boolean;
}


type Props = {
  params: Promise<{ id: string; chapterId: string }>;
};


export default function EditChapter(props: Props){
  // const router = useRouter();
  const { id: mangaId, chapterId } = use(props.params);
  
  const [title, setTitle] = useState("");
  const [number, setNumber] = useState("");
  const [currentImages, setCurrentImages] = useState<ChapterImage[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<number[]>([]);
  const [newImages, setNewImages] = useState<NewImage[]>([]);
  const [newImagesPreviews, setNewImagesPreviews] = useState<NewImagePreview[]>([]);
  const [maxPosition, setMaxPosition] = useState(0);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const fetchChapter = async () => {
      try {
        const response = await chapterApi.getChapter(mangaId, chapterId);
        console.log("Initial chapter data:", response);
        
        setTitle(response.title);
        setNumber(response.number.toString());
        
        // Sắp xếp ảnh theo position
        const images = response.images || [];
        console.log("Initial chapter images:", images);
        const sortedImages = [...images].sort((a, b) => a.position - b.position);
        console.log("Initial sorted images:", sortedImages);
        setCurrentImages(sortedImages);
        
        // Tìm vị trí lớn nhất
        const maxPos = sortedImages.length > 0 
          ? Math.max(...sortedImages.map(img => img.position)) 
          : -1;
        setMaxPosition(maxPos + 1);
      } catch (err) {
        console.error("Failed to fetch chapter:", err);
        setError("Không thể tải thông tin chapter. Vui lòng thử lại sau.");
      } finally {
        setIsFetching(false);
      }
    };

    fetchChapter();
  }, [mangaId, chapterId]);

  // Hàm xử lý khi chọn vị trí để thêm ảnh mới
  const handlePositionSelect = (position: number) => {
    setSelectedPosition(position);
    // Mở hộp thoại chọn file
    document.getElementById('new-chapter-image')?.click();
  };

  // Hàm xử lý khi chọn file ảnh mới cho một vị trí cụ thể
  const handleSingleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || selectedPosition === null) return;

    const file = files[0];
    const reader = new FileReader();
    
    reader.onloadend = () => {
      // Kiểm tra xem vị trí này đã có ảnh mới chưa
      const existingImageIndex = newImages.findIndex(img => img.position === selectedPosition);
      
      if (existingImageIndex !== -1) {
        // Nếu đã có, thay thế
        const updatedImages = [...newImages];
        const updatedPreviews = [...newImagesPreviews];
        
        updatedImages[existingImageIndex] = { file, position: selectedPosition };
        updatedPreviews[existingImageIndex] = { preview: reader.result as string, position: selectedPosition };
        
        setNewImages(updatedImages);
        setNewImagesPreviews(updatedPreviews);
      } else {
        // Nếu chưa có, thêm mới
        setNewImages([...newImages, { file, position: selectedPosition }]);
        setNewImagesPreviews([...newImagesPreviews, { preview: reader.result as string, position: selectedPosition }]);
      }
    };
    
    if (!file) {
      console.warn('No file selected for reading');
      return;
    }
    reader.readAsDataURL(file);
  };

  // Hàm xử lý khi upload nhiều ảnh cùng lúc
  const handleMultipleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Convert FileList to array and sort by filename
    const filesArray = Array.from(files).sort((a, b) => {
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
    
    let nextPosition = maxPosition;
    const newImagesArray: {file: File, position: number}[] = [];
    const newPreviewsArray: {preview: string, position: number}[] = [];
    
    // Xử lý từng file
    filesArray.forEach(file => {
      // Kiểm tra xem vị trí này đã có ảnh chưa (trong cả currentImages và newImages)
      while (
        currentImages.some(img => img.position === nextPosition && !imagesToDelete.includes(img.id)) ||
        newImages.some(img => img.position === nextPosition)
      ) {
        nextPosition++;
      }
      
      newImagesArray.push({ file, position: nextPosition });
      
      // Tạo preview
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviewsArray.push({ preview: reader.result as string, position: nextPosition });
        
        // Khi đã xử lý xong tất cả các file
        if (newPreviewsArray.length === filesArray.length) {
          setNewImages([...newImages, ...newImagesArray]);
          setNewImagesPreviews([...newImagesPreviews, ...newPreviewsArray]);
          setMaxPosition(Math.max(maxPosition, nextPosition + 1));
        }
      };
      reader.readAsDataURL(file);
      
      nextPosition++;
    });
  };

  // Xóa ảnh mới
  const removeNewImage = (position: number) => {
    setNewImages(newImages.filter(img => img.position !== position));
    setNewImagesPreviews(newImagesPreviews.filter(img => img.position !== position));
  };

  // Đánh dấu xóa/khôi phục ảnh hiện tại
  const toggleImageToDelete = (imageId: number) => {
    if (imagesToDelete.includes(imageId)) {
      setImagesToDelete(imagesToDelete.filter(id => id !== imageId));
    } else {
      setImagesToDelete([...imagesToDelete, imageId]);
    }
  };

  // Lấy danh sách tất cả các vị trí đã được sử dụng
  const getAllPositions = () => {
    const positions = new Set<number>();
    
    // Thêm vị trí của ảnh hiện tại (không bị đánh dấu xóa)
    currentImages.forEach(img => {
      if (!imagesToDelete.includes(img.id)) {
        positions.add(img.position);
      }
    });
    
    // Thêm vị trí của ảnh mới
    newImages.forEach(img => {
      positions.add(img.position);
    });
    
    return Array.from(positions).sort((a, b) => a - b);
  };

  // Lấy ảnh (hiện tại hoặc mới) ở một vị trí cụ thể
  const getImageAtPosition = (position: number) => {
    // Kiểm tra trong ảnh hiện tại
    const currentImage = currentImages.find(img => img.position === position && !imagesToDelete.includes(img.id));
    if (currentImage) return { type: 'current' as const, image: currentImage };
    
    // Kiểm tra trong ảnh mới
    const newImageIndex = newImages.findIndex(img => img.position === position);
    if (newImageIndex !== -1) {
      const newImage = newImages[newImageIndex];
      const preview = newImagesPreviews[newImageIndex];
        return {
          type: 'new' as const,
          image: newImage,
          preview,
          is_external: newImage?.is_external
      }
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    
    if (!title || !number) {
      setError("Vui lòng nhập tiêu đề và số chapter");
      return;
    }
    
    const allPositions = getAllPositions();
    if (allPositions.length === 0) {
      setError("Chapter phải có ít nhất một ảnh");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Chuẩn bị dữ liệu để cập nhật chapter
      const formData = new FormData();
      formData.append("title", title);
      formData.append("number", number);
      
      // Thêm các ảnh cần xóa (theo vị trí)
      const positionsToDelete: number[] = [];
      currentImages.forEach(img => {
        if (imagesToDelete.includes(img.id)) {
          positionsToDelete.push(img.position);
        }
      });
      
      positionsToDelete.forEach(position => {
        formData.append("image_positions_to_delete[]", position.toString());
      });
      
      // Thêm thông tin về vị trí ảnh cần cập nhật
      const positionMapping: Record<number, number> = {};
      currentImages.forEach(img => {
        if (!imagesToDelete.includes(img.id)) {
          positionMapping[img.position] = img.position;
        }
      });
      
      Object.entries(positionMapping).forEach(([oldPos, newPos]) => {
        formData.append(`image_positions[${oldPos}]`, newPos.toString());
      });
      
      // Thêm ảnh mới
      newImages.forEach(image => {
        if (image.is_external && image.external_url) {
          // Nếu là ảnh từ nguồn ngoài, thêm URL
          formData.append("new_images[]", image.external_url);
        } else if (image.file) {
          // Nếu là file upload từ máy tính
          formData.append("new_images[]", image.file);
        }
        formData.append("new_image_positions[]", image.position.toString());
      });
      
      // Gọi API cập nhật chapter
      await chapterApi.updateChapter(mangaId, chapterId, formData);
      
      // Cập nhật lại state sau khi lưu thành công
      setNewImages([]);
      setNewImagesPreviews([]);
      setImagesToDelete([]);
      
      // Tải lại dữ liệu chapter
      const response = await chapterApi.getChapter(mangaId, chapterId);
      setTitle(response.title);
      setNumber(response.number.toString());
      setCurrentImages(response.images || []);
      setSuccess(true);
    } catch (err) {
      console.error("Failed to update chapter:", err);
      setError("Cập nhật chapter thất bại. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  // Hàm xử lý import ảnh từ URL
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
      
      // Xử lý theo từng trang web khác nhau
      if (hostname.includes('nettruyen') || hostname.includes('truyenvn.shop')) {
        // Xử lý cho NetTruyen và TruyenVN
        // Format: /manga/ten-truyen/chapter-X hoặc /truyen-tranh/ten-truyen/chapter-X
        const chapterMatch = pathname.match(/chapter-(\d+)/i);
        if (!chapterMatch) {
          throw new Error("Không thể xác định số chapter từ URL");
        }
        
        const chapterNum = chapterMatch[1];
        
        // Thử lấy ảnh từ trang web
        try {
          // Giả lập request để lấy HTML của trang
          const response = await fetch(importUrl);
          const html = await response.text();
          
          // Tìm tất cả các URL ảnh trong HTML
          const imgRegex = /<img[^>]+src="([^">]+)"[^>]*>/g;
          let match;
          while ((match = imgRegex.exec(html)) !== null) {
            const imgSrc = match[1];
            if (imgSrc && !imgSrc.includes('logo') && !imgSrc.includes('banner') && !imgSrc.includes('icon')) {
              imageUrls.push(imgSrc);
            }
          }
          
          // Lọc ra các ảnh chapter thực sự
          imageUrls = imageUrls.filter(url => 
            url.includes('/chapter-') || 
            url.includes('/chuong-') || 
            url.includes(`/${chapterNum}-`) ||
            url.includes(`/${chapterNum}/`)
          );
        } catch (err) {
          console.error("Error fetching page HTML:", err);
          throw new Error("Không thể tải nội dung từ trang web");
        }
      } else if (hostname.includes('sayhentaii.art')) {
        // Xử lý cho SayHentaii
        // Format: /truyen-set-up/chuong-X
        const chapterMatch = pathname.match(/chuong-(\d+)/i);
        if (!chapterMatch) {
          throw new Error("Không thể xác định số chapter từ URL");
        }
        
        const chapterNum = chapterMatch[1];
        
        try {
          // Giả lập request để lấy HTML của trang
          const response = await fetch(importUrl);
          const html = await response.text();
          
          // Tìm tất cả các URL ảnh trong HTML
          const imgRegex = /<img[^>]+src="([^">]+)"[^>]*>/g;
          let match;
          while ((match = imgRegex.exec(html)) !== null) {
            const imgSrc = match[1];
            if (imgSrc && !imgSrc.includes('logo') && !imgSrc.includes('banner') && !imgSrc.includes('icon')) {
              imageUrls.push(imgSrc);
            }
          }
          
          // Lọc ra các ảnh chapter thực sự
          imageUrls = imageUrls.filter(url => 
            url.includes('/chuong-') || 
            url.includes(`/${chapterNum}/`) ||
            url.includes(`chapter-${chapterNum}`)
          );
        } catch (err) {
          console.error("Error fetching page HTML:", err);
          throw new Error("Không thể tải nội dung từ trang web");
        }
      } else if (hostname.includes('hentaivn.cx') || hostname.includes('img.henzz.xyz')) {
        // Xử lý cho HentaiVN - giữ nguyên logic cũ
        const chapterMatch = pathname.match(/chuong-(\d+)/i);
        if (!chapterMatch) {
          throw new Error("URL không hợp lệ");
        }
        const chapterNum = chapterMatch[1];

        // Tạo danh sách URL ảnh
        let index = 1;
        while (index <= 100) { // Giới hạn tối đa 100 ảnh
          const paddedIndex = index.toString().padStart(3, '0');
          const imageUrl = `https://img.henzz.xyz/mo-khoa-tim-em/chuong-${chapterNum}/${paddedIndex}.jpg`;
          
          try {
            // Kiểm tra xem ảnh có tồn tại không
            const response = await fetch(imageUrl, { method: 'HEAD' });
            if (response.ok) {
              imageUrls.push(imageUrl);
              index++;
            } else {
              break; // Nếu không tìm thấy ảnh, dừng vòng lặp
            }
          } catch (err) {
            console.error("Error checking image:", err);
            break; // Nếu có lỗi, dừng vòng lặp
          }
        }
      } else {
        // Xử lý chung cho các trang web khác
        try {
          // Giả lập request để lấy HTML của trang
          const response = await fetch(importUrl);
          const html = await response.text();
          
          // Tìm tất cả các URL ảnh trong HTML
          const imgRegex = /<img[^>]+src="([^">]+)"[^>]*>/g;
          let match;
          while ((match = imgRegex.exec(html)) !== null) {
            const imgSrc = match[1];
            // Lọc bỏ các ảnh logo, banner, icon
            if (imgSrc && !imgSrc.includes('logo') && !imgSrc.includes('banner') && !imgSrc.includes('icon')) {
              // Chuyển đổi URL tương đối thành tuyệt đối nếu cần
              if (imgSrc.startsWith('/')) {
                imageUrls.push(`${url.protocol}//${url.host}${imgSrc}`);
              } else if (!imgSrc.startsWith('http')) {
                imageUrls.push(`${url.protocol}//${url.host}/${imgSrc}`);
              } else {
                imageUrls.push(imgSrc);
              }
            }
          }
          
          // Lọc các ảnh có kích thước lớn (có thể là ảnh chapter)
          // Đây chỉ là giải pháp tạm thời, cần cải thiện thuật toán lọc
          imageUrls = imageUrls.filter(url => 
            !url.includes('avatar') && 
            !url.includes('thumbnail') && 
            !url.includes('small')
          );
        } catch (err) {
          console.error("Error fetching page HTML:", err);
          throw new Error("Không thể tải nội dung từ trang web");
        }
      }

      if (imageUrls.length === 0) {
        throw new Error("Không tìm thấy ảnh nào từ URL này");
      }

      // Thêm ảnh vào state
      let nextPosition = maxPosition;
      const newImagesArray: NewImage[] = [];
      const newPreviewsArray: NewImagePreview[] = [];

      for (const imageUrl of imageUrls) {
        // Thêm trực tiếp URL mà không tải ảnh về
        newImagesArray.push({
          position: nextPosition,
          is_external: true,
          external_url: imageUrl
        });
        
        newPreviewsArray.push({
          preview: imageUrl,
          position: nextPosition,
          is_external: true
        });
        
        nextPosition++;
      }

      // Cập nhật state
      setNewImages([...newImages, ...newImagesArray]);
      setNewImagesPreviews([...newImagesPreviews, ...newPreviewsArray]);
      setMaxPosition(Math.max(maxPosition, nextPosition));
      setSuccess(true);
      setImportUrl("");
    } catch (error) {
      console.error("Lỗi khi import ảnh:", error);
      setError(error instanceof Error ? error.message : "Lỗi khi import ảnh từ URL");
    } finally {
      setIsImporting(false);
    }
  };

  // Thêm hàm xóa tất cả ảnh
  const handleDeleteAllImages = () => {
    // Đánh dấu tất cả ảnh hiện tại để xóa
    setImagesToDelete(currentImages.map(img => img.id));
    // Xóa tất cả ảnh mới
    setNewImages([]);
    setNewImagesPreviews([]);
    setShowDeleteConfirm(false);
  };

  if (isFetching) {
    return (
      <div className="flex min-h-screen bg-gray-900">
        <AdminSidebar />
        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-400">Đang tải thông tin chapter...</p>
          </div>
        </main>
      </div>
    );
  }

  // Lấy danh sách tất cả các vị trí đã được sử dụng
  const allPositions = getAllPositions();
  
  // Tạo một mảng các vị trí từ 0 đến max position
  const allPossiblePositions = Array.from(
    { length: Math.max(...allPositions, maxPosition) + 1 }, 
    (_, i) => i
  );

  return (
    <div className="flex min-h-screen bg-gray-900">
      <AdminSidebar />

      <main className="flex-1 p-6">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold mb-2">Chỉnh sửa chapter</h1>
            <Link
              href={`/admin/mangas/${mangaId}`}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
            >
              Quay lại
            </Link>
          </div>
          <p className="text-gray-400">Chỉnh sửa thông tin và hình ảnh của chapter</p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-100 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-900/50 border border-green-500 text-green-100 px-4 py-3 rounded-lg mb-6">
            Cập nhật chapter thành công!
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

          {/* Quản lý hình ảnh theo vị trí */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Quản lý hình ảnh theo vị trí</h3>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Xóa tất cả ảnh
              </button>
            </div>

            {/* Modal xác nhận xóa */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
                  <h4 className="text-xl font-bold mb-4">Xác nhận xóa</h4>
                  <p className="text-gray-300 mb-6">
                    Bạn có chắc chắn muốn xóa tất cả ảnh? Hành động này không thể hoàn tác.
                  </p>
                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAllImages}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Xóa tất cả
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Input ẩn để upload ảnh cho vị trí cụ thể */}
            <input
              id="new-chapter-image"
              type="file"
              accept="image/*"
              onChange={handleSingleImageChange}
              className="hidden"
            />
            
            {/* Hiển thị tất cả các vị trí */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {allPossiblePositions.map((position) => {
                const imageData = getImageAtPosition(position);
                
                return (
                  <div key={`position-${position}`} className="relative bg-gray-700 rounded-lg p-2">
                    <div className="aspect-[2/3] relative">
                      {imageData ? (
                        <>
                          <img
                            src={
                              imageData.type === 'current' && imageData.image
                                ? (imageData.image.url)
                                : (imageData.image && imageData.is_external ? imageData.image.external_url : imageData.preview?.preview || '')
                            }
                            alt={`Ảnh vị trí ${position}`}
                            onError={(e) => {
                              const img = e.currentTarget;
                              img.onerror = null;
                              img.src = "/placeholder-image.jpg";
                            }}
                            className="w-full h-full object-contain rounded"
                          />
                          <div className="absolute top-0 left-0 bg-gray-800 text-white text-xs px-2 py-1 rounded-br">
                            Vị trí {position}
                          </div>
                          {imageData.type === 'current' && imagesToDelete.includes(imageData.image.id) && (
                            <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center">
                              <span className="text-white font-bold">Đã đánh dấu xóa</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800 rounded">
                          <div className="text-center">
                            <div className="text-gray-400 mb-2">Vị trí {position}</div>
                            <button
                              type="button"
                              onClick={() => handlePositionSelect(position)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                            >
                              Thêm ảnh
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {imageData && (
                      <div className="flex justify-end mt-2">
                        {imageData.type === 'current' ? (
                          <button
                            type="button"
                            onClick={() => toggleImageToDelete(imageData.image.id)}
                            className={`p-1 rounded ${
                              imagesToDelete.includes(imageData.image.id) 
                                ? 'bg-green-600 hover:bg-green-700 text-white' 
                                : 'bg-red-600 hover:bg-red-700 text-white'
                            }`}
                          >
                            {imagesToDelete.includes(imageData.image.id) ? 'Khôi phục' : 'Xóa'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (imageData?.image) {
                                removeNewImage(imageData.image.position);
                              }
                            }}
                            className="p-1 rounded bg-red-600 hover:bg-red-700 text-white"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Thêm vị trí mới */}
              <div className="relative bg-gray-700 rounded-lg p-2">
                <div className="aspect-[2/3] relative">
                  <div className="w-full h-full flex items-center justify-center bg-gray-800 rounded">
                    <div className="text-center">
                      <div className="text-gray-400 mb-2">Vị trí mới</div>
                      <button
                        type="button"
                        onClick={() => handlePositionSelect(allPossiblePositions.length)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                      >
                        Thêm ảnh
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tải lên nhiều ảnh cùng lúc */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4">Tải lên nhiều ảnh cùng lúc</h3>
            <p className="text-sm text-gray-400 mb-2">
              Tải lên nhiều ảnh cùng lúc. Các ảnh sẽ được thêm vào các vị trí còn trống theo thứ tự.
            </p>
            
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center">
              <input
                id="multiple-chapter-images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleMultipleImagesChange}
                className="hidden"
              />
              <label
                htmlFor="multiple-chapter-images"
                className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Chọn nhiều ảnh
              </label>
              <p className="mt-1 text-xs text-gray-500">
                PNG, JPG, GIF, WEBP tối đa 5MB mỗi ảnh
              </p>
            </div>
          </div>

          {/* Import ảnh từ URL */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4">Import ảnh từ URL</h3>
            <p className="text-sm text-gray-400 mb-2">
              Nhập URL chapter từ các trang web truyện như nettruyen, sayhentaii, truyenvn, hentaivn, v.v. để import tất cả ảnh của chapter đó
            </p>
            
            <div className="flex gap-4">
              <input
                type="text"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="Ví dụ: https://nettruyen1905.com/manga/ten-truyen/chapter-1 hoặc https://truyenvn.shop/truyen-tranh/ten-truyen/chapter-1"
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

          <div className="flex justify-end space-x-4 mt-8">
            <Link
              href={`/admin/mangas/${mangaId}`}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
            >
              Hủy
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className={`px-6 py-3 rounded-lg text-white ${
                isLoading
                  ? "bg-blue-700 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-500"
              }`}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang lưu...
                </span>
              ) : (
                "Lưu thay đổi"
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
} 