"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AdminLayout from "../../../components/admin/AdminLayout";
import { scheduledCrawlApi } from "../../../services/api";

interface ScheduledCrawl {
  id: number;
  manga_id: number;
  manga_title: string;
  url: string;
  schedule_type: string;
  schedule_time: string;
  schedule_days: string;
  max_chapters: string;
  chapter_range: string;
  delay: string;
  status: string;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function ScheduledCrawls() {
  // Xóa router vì không sử dụng
  const [scheduledCrawls, setScheduledCrawls] = useState<ScheduledCrawl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  // Fetch scheduled crawls
  const fetchScheduledCrawls = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (selectedStatus) {
        params.status = selectedStatus;
      }
      const response = await scheduledCrawlApi.getScheduledCrawls(params);
      console.log(response);
      setScheduledCrawls(response || []);
    } catch (err) {
      console.error("Error fetching scheduled crawls:", err);
      setError("Không thể tải danh sách lịch crawl. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  // Chỉ fetch dữ liệu khi selectedStatus thay đổi
  useEffect(() => {
    fetchScheduledCrawls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus]);

  // Handle status change
  const handleStatusChange = async (id: number, status: "active" | "paused" | "completed") => {
    try {
      setLoading(true);
      await scheduledCrawlApi.updateScheduledCrawl(id, { status });
      setSuccess(`Đã cập nhật trạng thái thành ${formatStatus(status)}.`);
      fetchScheduledCrawls();
    } catch (err: unknown) {
      console.error("Error updating scheduled crawl status:", err);
      const errorResponse = err as { response?: { data?: { error?: string } } };
      setError(errorResponse.response?.data?.error || "Có lỗi xảy ra khi cập nhật trạng thái. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  // Format schedule type
  const formatScheduleType = (type: string) => {
    switch (type) {
      case "daily":
        return "Hàng ngày";
      case "weekly":
        return "Hàng tuần";
      case "monthly":
        return "Hàng tháng";
      default:
        return type;
    }
  };

  // Format schedule days
  const formatScheduleDays = (days: string) => {
    if (!days) return "";

    const dayMap: Record<string, string> = {
      "1": "Thứ 2",
      "2": "Thứ 3",
      "3": "Thứ 4",
      "4": "Thứ 5",
      "5": "Thứ 6",
      "6": "Thứ 7",
      "7": "CN",
    };

    return days.split(",").map(day => dayMap[day] || day).join(", ");
  };

  // Format status
  const formatStatus = (status: string) => {
    switch (status) {
      case "active":
        return "Đang hoạt động";
      case "paused":
        return "Tạm dừng";
      case "completed":
        return "Hoàn thành";
      default:
        return status;
    }
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("vi-VN");
  };

  // Handle run now
  const handleRunNow = async (id: number) => {
    try {
      setLoading(true);
      await scheduledCrawlApi.runScheduledCrawlNow(id);
      setSuccess("Đã bắt đầu chạy crawl. Quá trình này có thể mất vài phút.");
      fetchScheduledCrawls();
    } catch (err: unknown) {
      console.error("Error running scheduled crawl:", err);
      const errorResponse = err as { response?: { data?: { error?: string } } };
      setError(errorResponse.response?.data?.error || "Có lỗi xảy ra khi chạy crawl. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa lịch crawl này không?")) {
      return;
    }

    try {
      setLoading(true);
      await scheduledCrawlApi.deleteScheduledCrawl(id);
      setSuccess("Đã xóa lịch crawl thành công.");
      fetchScheduledCrawls();
    } catch (err: unknown) {
      console.error("Error deleting scheduled crawl:", err);
      const errorResponse = err as { response?: { data?: { error?: string } } };
      setError(errorResponse.response?.data?.error || "Có lỗi xảy ra khi xóa lịch crawl. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold mb-2">Quản lý lịch crawl</h1>
          <Link
            href="/admin/auto-crawl"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Tạo lịch crawl mới
          </Link>
        </div>
        <p className="text-gray-400">
          Quản lý các lịch tự động crawl manga định kỳ
        </p>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-100 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-900/50 border border-green-500 text-green-100 px-4 py-3 rounded-lg mb-6">
          {success}
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center space-x-4">
          <label className="text-gray-300">Lọc theo trạng thái:</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả</option>
            <option value="active">Đang hoạt động</option>
            <option value="paused">Tạm dừng</option>
            <option value="completed">Hoàn thành</option>
          </select>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg overflow-hidden">
        {loading && scheduledCrawls.length === 0 ? (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-400">Đang tải dữ liệu...</p>
          </div>
        ) : scheduledCrawls.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-400">Không có lịch crawl nào.</p>
            <Link
              href="/admin/auto-crawl"
              className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Tạo lịch crawl mới
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-700">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Manga
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Lịch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Cấu hình
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Lần chạy gần nhất
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Lần chạy tiếp theo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {scheduledCrawls.map((crawl) => (
                  <tr key={crawl.id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/admin/mangas/${crawl.manga_id}`}
                        className="text-blue-400 hover:underline"
                      >
                        {crawl.manga_title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div>{formatScheduleType(crawl.schedule_type)}</div>
                        <div className="text-gray-400">{crawl.schedule_time}</div>
                        {crawl.schedule_type === "weekly" && (
                          <div className="text-gray-400 text-xs">
                            {formatScheduleDays(crawl.schedule_days)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div>Max: {crawl.max_chapters}</div>
                        {crawl.chapter_range && (
                          <div className="text-gray-400 text-xs">
                            Range: {crawl.chapter_range}
                          </div>
                        )}
                        {crawl.delay && (
                          <div className="text-gray-400 text-xs">
                            Delay: {crawl.delay}s
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          crawl.status === "active"
                            ? "bg-green-900 text-green-300"
                            : crawl.status === "paused"
                            ? "bg-yellow-900 text-yellow-300"
                            : "bg-gray-700 text-gray-300"
                        }`}
                      >
                        {formatStatus(crawl.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                      {formatDate(crawl.last_run_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                      {formatDate(crawl.next_run_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleRunNow(crawl.id)}
                          className="text-blue-500 hover:text-blue-400"
                          title="Chạy ngay"
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
                              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </button>
                        <Link
                          href={`/admin/scheduled-crawls/${crawl.id}/edit`}
                          className="text-yellow-500 hover:text-yellow-400"
                          title="Sửa"
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
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </Link>
                        {crawl.status === "active" ? (
                          <button
                            onClick={() => handleStatusChange(crawl.id, "paused")}
                            className="text-yellow-500 hover:text-yellow-400"
                            title="Tạm dừng"
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
                                d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStatusChange(crawl.id, "active")}
                            className="text-green-500 hover:text-green-400"
                            title="Kích hoạt"
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
                                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(crawl.id)}
                          className="text-red-500 hover:text-red-400"
                          title="Xóa"
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
