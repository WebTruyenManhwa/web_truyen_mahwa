/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { proxyApi } from '../../services/api';

interface BatchImportModalProps {
  mangaId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportResult {
  url: string;
  status: 'success' | 'error';
  message?: string;
  chapter_id?: number;
  title?: string;
  number?: number;
  image_count?: number;
}

const BatchImportModal: React.FC<BatchImportModalProps> = ({ mangaId, isOpen, onClose, onSuccess }) => {
  const [urls, setUrls] = useState<string>('');
  const [autoNumber, setAutoNumber] = useState<boolean>(true);
  const [startNumber, setStartNumber] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResults([]);
    setIsLoading(true);

    try {
      // Split URLs by newline and filter out empty lines
      const urlList = urls
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0);

      if (urlList.length === 0) {
        setError('Vui lòng nhập ít nhất một URL');
        setIsLoading(false);
        return;
      }

      const response = await proxyApi.batchImportChapters(mangaId, urlList, {
        autoNumber,
        startNumber
      });

      setResults(response.results || []);
      
      // If at least one chapter was successfully imported, call onSuccess
      if (response.results && response.results.some((result: { status: string; }) => result.status === 'success')) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Failed to import chapters:', err);
      setError(err.response?.data?.error || 'Lỗi khi import chapters');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Import hàng loạt chapter</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-100 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Danh sách URL chapters
            </label>
            <p className="text-sm text-gray-400 mb-2">
              Nhập mỗi URL trên một dòng. Hệ thống sẽ tự động crawl và tạo chapter từ các URL này.
              Hỗ trợ các trang như nettruyen, truyenvn.shop, hentaivn, manhuavn, v.v.
            </p>
            <textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 h-60"
              placeholder="https://nettruyen.com/manga/ten-truyen/chapter-1&#10;https://nettruyen.com/manga/ten-truyen/chapter-2&#10;..."
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoNumber}
                  onChange={(e) => setAutoNumber(e.target.checked)}
                  className="mr-2 h-4 w-4"
                  disabled={isLoading}
                />
                <span>Tự động đánh số chapter</span>
              </label>
              <p className="text-sm text-gray-400 mt-1">
                Nếu bật, hệ thống sẽ tự động đánh số chapter theo thứ tự URL (bắt đầu từ số dưới đây).
                Nếu tắt, hệ thống sẽ cố gắng lấy số chapter từ URL.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Số chapter bắt đầu
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={startNumber.toString()}
                onChange={(e) => {
                  const value = e.target.value;
                  setStartNumber(value === '' ? 0 : parseFloat(value));
                }}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập số chapter bắt đầu"
                disabled={isLoading || !autoNumber}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="mr-4 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              disabled={isLoading}
            >
              Hủy
            </button>
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
                  Đang import...
                </span>
              ) : (
                "Import chapters"
              )}
            </button>
          </div>
        </form>

        {results.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-medium mb-4">Kết quả import ({results.length} URLs)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-gray-700">
                  <tr>
                    <th scope="col" className="px-4 py-3">URL</th>
                    <th scope="col" className="px-4 py-3">Trạng thái</th>
                    <th scope="col" className="px-4 py-3">Chapter</th>
                    <th scope="col" className="px-4 py-3">Số ảnh</th>
                    <th scope="col" className="px-4 py-3">Thông tin</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr key={index} className={`border-b border-gray-700 ${
                      result.status === 'success' ? 'bg-green-900/20' : 'bg-red-900/20'
                    }`}>
                      <td className="px-4 py-3">
                        <div className="truncate max-w-xs" title={result.url}>
                          {result.url}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          result.status === 'success' ? 'bg-green-900 text-green-100' : 'bg-red-900 text-red-100'
                        }`}>
                          {result.status === 'success' ? 'Thành công' : 'Lỗi'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {result.status === 'success' ? (
                          <span>
                            {result.title} (#{result.number})
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {result.image_count || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {result.message || (result.status === 'success' ? `ID: ${result.chapter_id}` : '-')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchImportModal;