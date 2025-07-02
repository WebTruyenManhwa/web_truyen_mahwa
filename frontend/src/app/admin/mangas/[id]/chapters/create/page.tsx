"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminSidebar from "../../../../../../components/admin/AdminSidebar";
import { chapterApi } from "../../../../../../services/api";

export default function CreateChapter({ params }: { params: { id: string } }) {
  const router = useRouter();
  const mangaId = params.id;
  
  const [title, setTitle] = useState("");
  const [number, setNumber] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagesPreviews, setImagesPreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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
          setImagesPreviews([...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
    
    setImages([...newImages]);
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    const newPreviews = [...imagesPreviews];
    
    newImages.splice(index, 1);
    newPreviews.splice(index, 1);
    
    setImages(newImages);
    setImagesPreviews(newPreviews);
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === images.length - 1)
    ) {
      return;
    }
    
    const newImages = [...images];
    const newPreviews = [...imagesPreviews];
    
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap images
    [newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]];
    [newPreviews[index], newPreviews[targetIndex]] = [newPreviews[targetIndex], newPreviews[index]];
    
    setImages(newImages);
    setImagesPreviews(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    
    if (!title || !number) {
      setError("Vui lòng nhập tiêu đề và số chapter");
      return;
    }
    
    if (images.length === 0) {
      setError("Vui lòng tải lên ít nhất một ảnh cho chapter");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("number", number);
      
      // Append each image with its position
      images.forEach((image, index) => {
        formData.append(`images[]`, image);
      });
      
      // Create chapter
      await chapterApi.createChapter(mangaId, formData);
      
      setSuccess(true);
      
      // Reset form
      setTitle("");
      setNumber("");
      setImages([]);
      setImagesPreviews([]);
      
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
            Tạo chapter mới thành công! Đang chuyển hướng...
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