import React, { useState } from 'react';
import { errorReportApi } from '../services/api';
import { useTheme } from '../hooks/useTheme';

// Define the available error types
const ERROR_TYPES = [
  { value: '', label: '--Chọn loại lỗi--' },
  { value: 'missing_images', label: 'Thiếu hình ảnh' },
  { value: 'wrong_order', label: 'Sai thứ tự hình ảnh' },
  { value: 'low_quality', label: 'Hình ảnh chất lượng thấp' },
  { value: 'wrong_chapter', label: 'Sai nội dung chapter' },
  { value: 'broken_images', label: 'Hình ảnh bị hỏng/không hiển thị' },
  { value: 'incorrect_translation', label: 'Dịch sai/chưa đúng' },
  { value: 'other', label: 'Lỗi khác' }
];

interface ErrorReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mangaId: string | number;
  chapterId: string | number;
  chapterNumber?: number;
}

const ErrorReportDialog: React.FC<ErrorReportDialogProps> = ({
  isOpen,
  onClose,
  mangaId,
  chapterId,
  chapterNumber
}) => {
  const { theme } = useTheme();
  const [errorType, setErrorType] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset the form when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setErrorType('');
      setDescription('');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!errorType) {
      setError('Vui lòng chọn loại lỗi');
      return;
    }

    if (description.length < 10 && errorType === 'other') {
      setError('Vui lòng mô tả chi tiết lỗi (ít nhất 10 ký tự)');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await errorReportApi.createErrorReport(
        mangaId,
        chapterId,
        { error_type: errorType, description }
      );

      setSuccess(true);
      setErrorType('');
      setDescription('');

      // Auto close after 3 seconds on success
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err) {
      console.error('Failed to submit error report:', err);
      setError('Đã xảy ra lỗi khi gửi báo cáo. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      ></div>

      {/* Dialog */}
      <div className={`relative w-full max-w-md p-6 ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-lg shadow-xl mx-4`}>
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold">BÁO LỖI</h2>
          {chapterNumber !== undefined && (
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Lý do truyện đang bị lỗi?
            </p>
          )}
        </div>

        {success ? (
          <div className="text-center py-4">
            <div className="mb-4 text-green-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Cảm ơn bạn!</h3>
            <p className={`mt-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Báo cáo lỗi của bạn đã được ghi nhận. Chúng tôi sẽ xử lý sớm nhất.
            </p>
            <button
              onClick={onClose}
              className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
            >
              Đóng
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 p-3 bg-red-500 bg-opacity-20 text-red-700 rounded text-sm">
                {error}
              </div>
            )}

            <div className="mb-4">
              <select
                value={errorType}
                onChange={(e) => setErrorType(e.target.value)}
                className={`w-full p-3 rounded border ${
                  theme === 'dark'
                    ? 'bg-gray-700 text-white border-gray-600'
                    : 'bg-gray-50 text-gray-800 border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                {ERROR_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <p className={`mt-1 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Mô tả chi tiết lỗi để được ưu tiên fix sớm nhất.
              </p>
            </div>

            <div className="mb-4">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả..."
                rows={4}
                className={`w-full p-3 rounded border ${
                  theme === 'dark'
                    ? 'bg-gray-700 text-white border-gray-600'
                    : 'bg-gray-50 text-gray-800 border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                maxLength={1000}
              ></textarea>
              <p className={`mt-1 text-xs flex justify-end ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {description.length}/1000
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 py-3 rounded ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex-1 py-3 rounded bg-red-600 hover:bg-red-700 text-white flex items-center justify-center ${
                  isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang gửi...
                  </>
                ) : (
                  'Gửi'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ErrorReportDialog;
