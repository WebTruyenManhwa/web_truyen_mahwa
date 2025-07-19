"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "../../../components/admin/AdminLayout";
import { proxyApi } from "../../../services/api";

export default function TestImageExtractor() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      // Validate form
      if (!url) {
        setError("Vui lòng nhập URL của chapter");
        setLoading(false);
        return;
      }

      // Call API
      const response = await proxyApi.testExtractImages(url);
      setResult(response);
    } catch (err: any) {
      console.error("Error extracting images:", err);
      setError(err.response?.data?.error || "Có lỗi xảy ra khi extract hình ảnh. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout children={undefined}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Test Image Extractor</h1>
        <p className="text-gray-400">
          Kiểm tra việc extract hình ảnh từ URL chapter
        </p>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-100 px-4 py-3 rounded-lg mb-6">
          <div className="font-bold mb-1">Lỗi:</div>
          <div>{error}</div>
        </div>
      )}

      <div className="bg-gray-800 rounded-lg p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-gray-300 mb-2">
                URL Chapter
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://nettruyen1905.com/manga/ta-la-ta-de/chapter-1"
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-gray-400 text-sm mt-1">
                URL của chapter cần extract hình ảnh
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center"
            >
              {loading ? (
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
                "Extract hình ảnh"
              )}
            </button>
          </div>
        </form>
      </div>

      {result && (
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-2">Kết quả ({result.image_count} hình ảnh)</h2>
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="mb-4">
              <p className="text-gray-300">URL: {result.url}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.images.map((imageUrl: string, index: number) => (
                <div key={index} className="bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-300 mb-2">Hình {index + 1}</p>
                  <div className="relative h-64 w-full">
                    <img
                      src={imageUrl}
                      alt={`Image ${index + 1}`}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.src = "https://via.placeholder.com/400x600?text=Image+Error";
                      }}
                    />
                  </div>
                  <p className="text-gray-400 text-xs mt-2 break-all">{imageUrl}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
