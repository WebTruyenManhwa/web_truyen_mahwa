/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, use } from "react";
// import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminSidebar from "../../../../../../../components/admin/AdminSidebar";
import { chapterApi, proxyApi } from "../../../../../../../services/api";

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
                !imgSrc.includes('tmp/0.png') && // Bỏ qua ảnh tmp/0.png
                !imgSrc.includes('tmp/1.png') && // Bỏ qua ảnh tmp/1.png
                !imgSrc.includes('tmp/2.png') && // Bỏ qua các ảnh tmp khác
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
          
          // Tìm riêng các thuộc tính data-src và data-original (NetTruyen thường dùng cách này)
          const dataAttrRegex = /data-(?:src|original)="([^"]+)"/g;
          while ((match = dataAttrRegex.exec(html)) !== null) {
            const imgSrc = match[1];
            if (imgSrc && typeof imgSrc === 'string' && 
                (imgSrc.includes('.jpg') || 
                 imgSrc.includes('.jpeg') || 
                 imgSrc.includes('.png') || 
                 imgSrc.includes('.webp') || 
                 imgSrc.includes('.gif')) &&
                !imgSrc.includes('tmp/0.png') && // Bỏ qua ảnh tmp/0.png
                !imgSrc.includes('tmp/1.png') && // Bỏ qua ảnh tmp/1.png
                !imgSrc.includes('tmp/2.png')) { // Bỏ qua các ảnh tmp khác
              // Chuẩn hóa URL và chuyển đổi kiểu
              const normalizedUrl = imgSrc.split('?')[0] as string;
              allImageUrls.add(normalizedUrl);
            }
          }
          
          console.log("Found all images:", Array.from(allImageUrls));
          
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
              // Thêm các pattern phổ biến của NetTruyen
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
            
            console.log("Filtered images by pattern:", filteredUrls);
            
            // Nếu sau khi lọc theo pattern vẫn còn nhiều ảnh, thử lọc theo URL pattern phổ biến
            if (filteredUrls.length > 0) {
              // Kiểm tra xem có pattern nhất quán không
              const commonPatterns = [
                /\/ch\/\d+\/\d+\.(jpg|png|webp|jpeg)/i,
                /\/images\/\d+\/\d+\.(jpg|png|webp|jpeg)/i,
                /\/chapter-\d+\/\d+\.(jpg|png|webp|jpeg)/i,
                // Thêm pattern cho NetTruyen
                /ntcdn\d+\.netcdn\.one.*\.(jpg|png|webp|jpeg)/i,
                /i\d+\.truyenvua\.com.*\.(jpg|png|webp|jpeg)/i,
                /\.netcdn\.one\/.*\/\d+\/\d+\.(jpg|png|webp|jpeg)/i
              ];
              
              let foundConsistentPattern = false;
              let bestMatchUrls: string[] = [];
              
              for (const pattern of commonPatterns) {
                const matchingUrls = filteredUrls.filter(url => pattern.test(url));
                if (matchingUrls.length >= 3) { // Nếu có ít nhất 3 ảnh cùng pattern
                  // Lấy pattern có nhiều ảnh nhất
                  if (matchingUrls.length > bestMatchUrls.length) {
                    bestMatchUrls = matchingUrls;
                    foundConsistentPattern = true;
                  }
                }
              }
              
              // Nếu tìm thấy pattern nhất quán, sử dụng nó
              if (foundConsistentPattern) {
                imageUrls = bestMatchUrls;
              } else {
                // Nếu không tìm thấy pattern nhất quán, sử dụng tất cả các URL đã lọc
                // nhưng loại bỏ các URL trùng lặp sau khi chuẩn hóa
                const normalizedUrls = new Set<string>();
                filteredUrls.forEach(url => {
                  if (url && typeof url === 'string') {
                    const normalizedUrl = url.split('?')[0] as string;
                    normalizedUrls.add(normalizedUrl);
                  }
                });
                imageUrls = Array.from(normalizedUrls);
              }
            }
          }
        } catch (err) {
          console.error("Error fetching page HTML:", err);
          throw new Error("Không thể tải nội dung từ trang web");
        }
      } else if (hostname.includes('truyenvn.shop')) {
        // Xử lý cho TruyenVN - cần proxy
        // Format: /manga/ten-truyen/chapter-X hoặc /truyen-tranh/ten-truyen/chapter-X
        const chapterMatch = pathname.match(/(?:chapter|chuong)-(\d+)/i);
        if (!chapterMatch) {
          throw new Error("Không thể xác định số chapter từ URL");
        }
        
        const chapterNum = chapterMatch[1];
        console.log("Detected chapter number:", chapterNum);
        
        // Thử lấy ảnh từ trang web
        try {
          // Giả lập request để lấy HTML của trang qua backend proxy
          const html = await proxyApi.fetchUrl(importUrl);
          
          // Tìm tất cả các URL ảnh trong HTML theo cấu trúc đặc trưng của truyenvn.shop
          const allImageUrls = new Set<string>();
          
          // Tìm các thẻ img trong div class="page-break no-gaps" và có class="wp-manga-chapter-img"
          const regex = /page-break no-gaps[^>]*>[\s\n]*<img[^>]+src=\s*"([^">]+)"[^>]*class="[^"]*wp-manga-chapter-img[^"]*"/g;
          let match;
          
          while ((match = regex.exec(html)) !== null) {
            const imgSrc = match[1]?.trim() || '';
            if (imgSrc) {
              allImageUrls.add(imgSrc);
              console.log("Found TruyenVN chapter image:", imgSrc);
            }
          }
          
          // Nếu không tìm thấy ảnh, tìm tất cả các img có class wp-manga-chapter-img
          if (allImageUrls.size === 0) {
            const imgRegex = /<img[^>]+src=\s*"([^">]+)"[^>]*class="[^"]*wp-manga-chapter-img[^"]*"/g;
            
            while ((match = imgRegex.exec(html)) !== null) {
              const imgSrc = match[1]?.trim() || '';
              if (imgSrc) {
                allImageUrls.add(imgSrc);
                console.log("Found TruyenVN chapter image (fallback):", imgSrc);
              }
            }
          }
          
          console.log("Found TruyenVN images:", Array.from(allImageUrls));
          imageUrls = Array.from(allImageUrls);
        } catch (err) {
          console.error("Error fetching TruyenVN page HTML:", err);
          throw new Error("Không thể tải nội dung từ trang web");
        }
      } else if (hostname.includes('hentaivn.cx') || hostname.includes('img.henzz.xyz')) {
        // Xử lý cho HentaiVN - cần proxy
        try {
          // Giả lập request để lấy HTML của trang qua backend proxy
          const html = await proxyApi.fetchUrl(importUrl);
          
          // Tìm tất cả các URL ảnh trong HTML
          const imgRegex = /<img[^>]+(?:src|data-src|data-original)="([^">]+)"[^>]*>/g;
          const allImageUrls = new Set<string>();
          let match;
          
          while ((match = imgRegex.exec(html)) !== null) {
            const imgSrc = match[1];
            if (typeof imgSrc === 'string' && 
                !imgSrc.includes('logo') && 
                !imgSrc.includes('banner') && 
                !imgSrc.includes('icon') &&
                !imgSrc.includes('avatar') &&
                !imgSrc.includes('thumbnail')) {
              allImageUrls.add(imgSrc);
            }
          }
          
          // Lọc ảnh theo đuôi file phổ biến
          imageUrls = Array.from(allImageUrls).filter(url => 
            (url.includes('.jpg') || 
             url.includes('.jpeg') || 
             url.includes('.png') || 
             url.includes('.webp') || 
             url.includes('.gif'))
          );
          
          console.log("Filtered HentaiVN images:", imageUrls);
        } catch (err) {
          console.error("Error fetching HentaiVN HTML:", err);
          throw new Error("Không thể tải nội dung từ trang web");
        }
      } else if (hostname.includes('manhuavn.top') || hostname.includes('g5img.top')) {
        // Xử lý cho ManhuaVN - cần proxy
        try {
          // Giả lập request để lấy HTML của trang qua backend proxy
          const html = await proxyApi.fetchUrl(importUrl);
          
          // Tìm tất cả các URL ảnh trong HTML
          const imgRegex = /<img[^>]+(?:src|data-src|data-original)="([^">]+)"[^>]*>/g;
          const allImageUrls = new Set<string>();
          let match;
          
          while ((match = imgRegex.exec(html)) !== null) {
            const imgSrc = match[1];
            if (typeof imgSrc === 'string' && 
                !imgSrc.includes('logo') && 
                !imgSrc.includes('banner') && 
                !imgSrc.includes('icon') &&
                !imgSrc.includes('avatar') &&
                !imgSrc.includes('thumbnail')) {
              allImageUrls.add(imgSrc);
            }
          }
          
          // Tìm riêng các thuộc tính data-src và data-original
          const dataAttrRegex = /data-(?:src|original)="([^"]+)"/g;
          while ((match = dataAttrRegex.exec(html)) !== null) {
            const imgSrc = match[1];
            if (typeof imgSrc === 'string' && 
                (imgSrc.includes('.jpg') || 
                 imgSrc.includes('.jpeg') || 
                 imgSrc.includes('.png') || 
                 imgSrc.includes('.webp') || 
                 imgSrc.includes('.gif'))) {
              allImageUrls.add(imgSrc);
            }
          }
          
          // Tìm các URL ảnh từ g5img.top
          const g5imgRegex = /https:\/\/img\d+\.g5img\.top\/[^"'\s]+/g;
          while ((match = g5imgRegex.exec(html)) !== null) {
            allImageUrls.add(match[0]);
          }
          
          console.log("Found ManhuaVN images:", Array.from(allImageUrls));
          
          // Lọc ảnh theo đuôi file phổ biến
          imageUrls = Array.from(allImageUrls).filter(url => 
            (url.includes('.jpg') || 
             url.includes('.jpeg') || 
             url.includes('.png') || 
             url.includes('.webp') || 
             url.includes('.gif')) &&
            !url.includes('facebook') &&
            !url.includes('fbcdn') &&
            !url.includes('ads')
          );
          
          console.log("Filtered ManhuaVN images:", imageUrls);
        } catch (err) {
          console.error("Error fetching ManhuaVN HTML:", err);
          
          // Fallback: Thử xử lý dựa trên pattern URL
          if (pathname.includes('/doc-truyen/') && pathname.includes('chapter-')) {
            // Phân tích URL để lấy tên manga và số chapter
            const pathParts = pathname.split('/');
            let mangaSlug = '';
            let chapterNum = '';
            
            for (const part of pathParts) {
              if (part.includes('chapter-')) {
                chapterNum = part.replace('chapter-', '');
              } else if (part !== 'doc-truyen' && part.length > 0) {
                mangaSlug = part;
              }
            }
            
            if (mangaSlug && chapterNum) {
              // Thử một số pattern phổ biến cho ManhuaVN
              for (let i = 1; i <= 50; i++) {
                const paddedNum = i.toString().padStart(2, '0');
                // Pattern 1: img02.g5img.top
                imageUrls.push(`https://img02.g5img.top/bbdata/sv45qu49qbd17n/${mangaSlug}_sv47pcaf7sl8fmmaq_${paddedNum}.jpg`);
                imageUrls.push(`https://img02.g5img.top/bbdata/sv45qu49qbd17n/${mangaSlug}_sv47pcaf7sl8fmmaq_${paddedNum}.png`);
                
                // Pattern 2: img01.g5img.top
                imageUrls.push(`https://img01.g5img.top/bbdata/sv45qu49qbd17n/${mangaSlug}_sv47pcaf7sl8fmmaq_${paddedNum}.jpg`);
                imageUrls.push(`https://img01.g5img.top/bbdata/sv45qu49qbd17n/${mangaSlug}_sv47pcaf7sl8fmmaq_${paddedNum}.png`);
              }
              console.log("Generated ManhuaVN image URLs based on pattern");
            }
          }
          
          if (imageUrls.length === 0) {
            throw new Error("Không thể tải nội dung từ trang web");
          }
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
          
          // Tìm riêng các thuộc tính data-src và data-original
          const dataAttrRegex = /data-(?:src|original)="([^"]+)"/g;
          while ((match = dataAttrRegex.exec(html)) !== null) {
            const imgSrc = match[1];
            if (typeof imgSrc === 'string' && 
                (imgSrc.includes('.jpg') || 
                 imgSrc.includes('.jpeg') || 
                 imgSrc.includes('.png') || 
                 imgSrc.includes('.webp') || 
                 imgSrc.includes('.gif'))) {
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
          
          console.log("Found all images:", Array.from(allImageUrls));
          
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
          
          console.log("Filtered images:", imageUrls);
          
          // Tìm pattern nhất quán trong URL
          const urlPatterns = [
            /\/ch\/\d+\/\d+\.(jpg|png|webp|jpeg)/i,
            /\/images\/\d+\/\d+\.(jpg|png|webp|jpeg)/i,
            /\/chapter-\d+\/\d+\.(jpg|png|webp|jpeg)/i
          ];
          
          for (const pattern of urlPatterns) {
            const matchingUrls = imageUrls.filter(url => pattern.test(url));
            if (matchingUrls.length >= 3) { // Nếu có ít nhất 3 ảnh cùng pattern
              imageUrls = matchingUrls;
              console.log("Found consistent pattern:", pattern, imageUrls);
              break;
            }
          }
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
          console.log("Found direct image URL in input:", directImageUrl);
          imageUrls.push(directImageUrl);
          
          // Thử tìm pattern cho URL ảnh tuần tự
          // Ví dụ: https://img.pixelimg.net/ba-chi-chu-nha/chapter-1/001.jpg
          // Cố gắng tìm các ảnh từ 001.jpg đến 100.jpg
          const sequentialPattern = directImageUrl.match(/(.*\/)(\d+)(\.[a-zA-Z]+)$/);
          if (sequentialPattern && sequentialPattern[1] && sequentialPattern[2] && sequentialPattern[3]) {
            const baseUrl = sequentialPattern[1];  // https://img.pixelimg.net/ba-chi-chu-nha/chapter-1/
            const numberPart = sequentialPattern[2]; // 001
            const extension = sequentialPattern[3];  // .jpg
            const digits = numberPart.length;
            const startNumber = parseInt(numberPart);
            
            console.log(`Detected sequential pattern: ${baseUrl}${numberPart}${extension}`);
            console.log(`Base URL: ${baseUrl}, Number: ${startNumber}, Digits: ${digits}, Extension: ${extension}`);
            
            // Thử tìm các ảnh tiếp theo trong chuỗi
            for (let i = startNumber + 1; i < startNumber + 100; i++) {
              // Format số với đúng số chữ số (padding)
              const formattedNumber = i.toString().padStart(digits, '0');
              const nextUrl = `${baseUrl}${formattedNumber}${extension}`;
              
              // Thêm vào danh sách để kiểm tra sau
              imageUrls.push(nextUrl);
            }
          }
        }
      }

      if (imageUrls.length === 0) {
        throw new Error("Không tìm thấy ảnh nào từ URL này");
      }
      
      // Loại bỏ các URL trùng lặp
      imageUrls = Array.from(new Set(imageUrls));
      console.log("Final image URLs after removing duplicates:", imageUrls);

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
      
      // Thử xử lý URL ảnh trực tiếp nếu có lỗi
      try {
        // Kiểm tra xem input có phải là URL ảnh trực tiếp không
        if (importUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
          console.log("Falling back to direct image URL:", importUrl);
          
          // Thêm ảnh vào state
          const position = maxPosition;
          const newImage: NewImage = {
            position,
            is_external: true,
            external_url: importUrl
          };
          
          const newPreview: NewImagePreview = {
            preview: importUrl,
            position,
            is_external: true
          };
          
          setNewImages([...newImages, newImage]);
          setNewImagesPreviews([...newImagesPreviews, newPreview]);
          setMaxPosition(maxPosition + 1);
          setSuccess(true);
          setImportUrl("");
          return;
        }
        
        // Kiểm tra xem input có chứa URL ảnh không
        const directImageUrlMatch = importUrl.match(/(https?:\/\/[^"\s]+\.(jpg|jpeg|png|webp|gif))/i);
        if (directImageUrlMatch) {
          const directImageUrl = directImageUrlMatch[0];
          console.log("Found direct image URL in input:", directImageUrl);
          
          // Thêm ảnh vào state
          const position = maxPosition;
          const newImage: NewImage = {
            position,
            is_external: true,
            external_url: directImageUrl
          };
          
          const newPreview: NewImagePreview = {
            preview: directImageUrl,
            position,
            is_external: true
          };
          
          setNewImages([...newImages, newImage]);
          setNewImagesPreviews([...newImagesPreviews, newPreview]);
          setMaxPosition(maxPosition + 1);
          setSuccess(true);
          setImportUrl("");
          return;
        }
      } catch (fallbackError) {
        console.error("Fallback error:", fallbackError);
      }
      
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
