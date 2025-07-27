"use client";

import React, { useState, useEffect } from 'react';
import { errorReportApi } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '../../../hooks/useTheme';

interface ErrorReport {
  id: number;
  error_type: string;
  description: string;
  created_at: string;
  resolved: boolean;
  resolved_at: string | null;
  chapter: {
    id: number;
    number: number;
    title: string | null;
    manga: {
      id: number;
      title: string;
    }
  };
  user: {
    id: number;
    username: string;
    email: string;
  } | null;
}

const ERROR_TYPE_LABELS: Record<string, string> = {
  'missing_images': 'Thiếu hình ảnh',
  'wrong_order': 'Sai thứ tự hình ảnh',
  'low_quality': 'Hình ảnh chất lượng thấp',
  'wrong_chapter': 'Sai nội dung chapter',
  'broken_images': 'Hình ảnh bị hỏng/không hiển thị',
  'incorrect_translation': 'Dịch sai/chưa đúng',
  'other': 'Lỗi khác'
};

export default function ErrorReportsPage() {
  const { theme } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [errorReports, setErrorReports] = useState<ErrorReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ErrorReport | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Redirect if not authenticated or not an admin
    if (isAuthenticated === false) {
      router.push('/auth/login');
    } else if (user && !user.is_admin && !user.is_super_admin) {
      router.push('/');
    } else {
      fetchErrorReports();
    }
  }, [isAuthenticated, user, router, showResolved]);

  const fetchErrorReports = async () => {
    setIsLoading(true);
    try {
      const data = await errorReportApi.getAllErrorReports({
        unresolved: !showResolved
      });
      setErrorReports(data);
    } catch (error) {
      console.error('Failed to fetch error reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveReport = async (id: number) => {
    setIsProcessing(true);
    try {
      await errorReportApi.resolveErrorReport(id);
      setErrorReports(prevReports =>
        prevReports.map(report =>
          report.id === id
            ? { ...report, resolved: true, resolved_at: new Date().toISOString() }
            : report
        )
      );
      setSelectedReport(null);
    } catch (error) {
      console.error('Failed to resolve error report:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteReport = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa báo cáo lỗi này?')) return;

    setIsProcessing(true);
    try {
      await errorReportApi.deleteErrorReport(id);
      setErrorReports(prevReports => prevReports.filter(report => report.id !== id));
      setSelectedReport(null);
    } catch (error) {
      console.error('Failed to delete error report:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isAuthenticated === false || (user && !user.is_admin && !user.is_super_admin)) {
    return null; // Prevent flash of content before redirect
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Quản lý báo cáo lỗi</h1>
          <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
            Quản lý và xử lý các báo cáo lỗi từ người dùng
          </p>
        </div>

        <div className="mt-4 md:mt-0">
          <button
            onClick={() => setShowResolved(!showResolved)}
            className={`px-4 py-2 rounded-md ${
              theme === 'dark'
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {showResolved ? 'Hiển thị báo cáo chưa xử lý' : 'Hiển thị tất cả báo cáo'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
        </div>
      ) : errorReports.length === 0 ? (
        <div className={`p-8 text-center rounded-lg ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
        }`}>
          <p className="text-xl">
            {showResolved
              ? 'Không có báo cáo lỗi nào.'
              : 'Không có báo cáo lỗi nào cần xử lý.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`lg:col-span-2 overflow-auto rounded-lg ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow'
          }`}>
            <table className="min-w-full">
              <thead>
                <tr className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}>
                  <th className="py-3 px-4 text-left">Truyện / Chapter</th>
                  <th className="py-3 px-4 text-left">Loại lỗi</th>
                  <th className="py-3 px-4 text-left">Ngày báo cáo</th>
                  <th className="py-3 px-4 text-left">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {errorReports.map(report => (
                  <tr
                    key={report.id}
                    className={`cursor-pointer ${
                      selectedReport?.id === report.id
                        ? theme === 'dark' ? 'bg-gray-700' : 'bg-blue-50'
                        : ''
                    }`}
                    onClick={() => setSelectedReport(report)}
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium">{report.chapter.manga.title}</div>
                      <div className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Chapter {report.chapter.number}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {ERROR_TYPE_LABELS[report.error_type] || report.error_type}
                    </td>
                    <td className="py-3 px-4">
                      {new Date(report.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      {report.resolved ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Đã xử lý
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Chưa xử lý
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={`p-4 rounded-lg h-fit ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow'
          }`}>
            {selectedReport ? (
              <div>
                <div className="mb-4 pb-4 border-b border-gray-700">
                  <h2 className="text-xl font-bold">Chi tiết báo cáo</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Truyện</h3>
                    <p className="mt-1">{selectedReport.chapter.manga.title}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Chapter</h3>
                    <p className="mt-1">Chapter {selectedReport.chapter.number}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Loại lỗi</h3>
                    <p className="mt-1">{ERROR_TYPE_LABELS[selectedReport.error_type] || selectedReport.error_type}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Mô tả</h3>
                    <p className="mt-1 whitespace-pre-wrap">{selectedReport.description}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Người báo cáo</h3>
                    <p className="mt-1">{selectedReport.user ? selectedReport.user.username : 'Người dùng ẩn danh'}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Ngày báo cáo</h3>
                    <p className="mt-1">{new Date(selectedReport.created_at).toLocaleString()}</p>
                  </div>

                  {selectedReport.resolved && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Ngày xử lý</h3>
                      <p className="mt-1">
                        {selectedReport.resolved_at
                          ? new Date(selectedReport.resolved_at).toLocaleString()
                          : 'Không có thông tin'
                        }
                      </p>
                    </div>
                  )}

                  <div className="pt-4 flex flex-col gap-3">
                    <Link
                      href={`/manga/${selectedReport.chapter.manga.id}/chapter/${selectedReport.chapter.id}`}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-center text-white rounded-md"
                    >
                      Xem chapter
                    </Link>

                    {!selectedReport.resolved && (
                      <button
                        onClick={() => handleResolveReport(selectedReport.id)}
                        disabled={isProcessing}
                        className={`w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-md ${
                          isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {isProcessing ? 'Đang xử lý...' : 'Đánh dấu đã xử lý'}
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteReport(selectedReport.id)}
                      disabled={isProcessing}
                      className={`w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-md ${
                        isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {isProcessing ? 'Đang xử lý...' : 'Xóa báo cáo'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-2">Chọn một báo cáo để xem chi tiết</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
