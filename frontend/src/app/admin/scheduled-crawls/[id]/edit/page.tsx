"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AdminLayout from "../../../../../components/admin/AdminLayout";
import { scheduledCrawlApi } from "../../../../../services/api";
import React from "react";

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
}

interface UpdateScheduledCrawlData {
  url: string;
  schedule_type: "daily" | "weekly" | "monthly";
  schedule_time: string;
  max_chapters: string;
  delay: string;
  status: "active" | "paused" | "completed";
  chapter_range?: string;
  schedule_days?: string;
  auto_next_chapters?: boolean;
}

export default function EditScheduledCrawl() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [scheduledCrawl, setScheduledCrawl] = useState<ScheduledCrawl | null>(null);

  // Form state
  const [url, setUrl] = useState("");
  const [maxChapters, setMaxChapters] = useState<string>("all");
  const [isCustomChapters, setIsCustomChapters] = useState<boolean>(false);
  const [customMaxChapters, setCustomMaxChapters] = useState<string>("");
  const [chapterRange, setChapterRange] = useState<string>("");
  const [delay, setDelay] = useState<string>("3..7");
  const [scheduleType, setScheduleType] = useState<string>("daily");
  const [scheduleTime, setScheduleTime] = useState<string>("03:00");
  const [scheduleDays, setScheduleDays] = useState<string[]>([]);
  const [status, setStatus] = useState<string>("active");

  // Determine if chapter range is required
  const isChapterRangeRequired = (maxChapters !== "all" && isCustomChapters) || maxChapters === "custom";
  // Determine if chapter range input should be disabled
  const isChapterRangeDisabled = maxChapters === "all" || (!isCustomChapters && maxChapters !== "custom");

  // Fetch scheduled crawl
  useEffect(() => {
    const fetchScheduledCrawl = async () => {
      try {
        setLoading(true);
        const response = await scheduledCrawlApi.getScheduledCrawl(params.id);

        // Log response để debug
        console.log("API Response:", response);

        // Kiểm tra cấu trúc response - API trả về trực tiếp dữ liệu, không có scheduled_crawl
        const crawlData = response.scheduled_crawl || response;

        if (!crawlData || typeof crawlData !== 'object') {
          console.error("Invalid response structure:", response);
          setError("Không tìm thấy thông tin lịch crawl hoặc định dạng dữ liệu không hợp lệ");
          setLoading(false);
          return;
        }

        // Lưu dữ liệu vào state
        setScheduledCrawl(crawlData);

        // Set form values với kiểm tra null/undefined
        setUrl(crawlData.url || "");

        // Xử lý max_chapters
        const maxChaptersValue = crawlData.max_chapters || "all";
        if (maxChaptersValue === "all" || ["1", "5", "10", "20", "50", "100"].includes(maxChaptersValue)) {
          setMaxChapters(maxChaptersValue);
          setIsCustomChapters(false);
        } else {
          setMaxChapters("custom");
          setCustomMaxChapters(maxChaptersValue);
          setIsCustomChapters(true);
        }

        setChapterRange(crawlData.chapter_range || "");
        setDelay(crawlData.delay || "3..7");
        setScheduleType(crawlData.schedule_type || "daily");
        setScheduleTime(crawlData.schedule_time || "03:00");
        setScheduleDays(crawlData.schedule_days ? crawlData.schedule_days.split(",") : []);
        setStatus(crawlData.status || "active");
      } catch (err: unknown) {
        console.error("Error fetching scheduled crawl:", err);
        const errorResponse = err as { response?: { status?: number, data?: { error?: string } } };

        // Kiểm tra lỗi 401 Unauthorized
        if (errorResponse.response?.status === 401) {
          setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
          // Chuyển hướng đến trang đăng nhập sau 2 giây
          setTimeout(() => {
            router.push("/auth/login");
          }, 2000);
        } else {
          setError(errorResponse.response?.data?.error || "Không thể tải thông tin lịch crawl. Vui lòng thử lại sau.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchScheduledCrawl();
  }, [params.id, router]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Validate form
      if ((maxChapters !== "all" && isCustomChapters) || maxChapters === "custom") {
        if (!chapterRange) {
          setError("Vui lòng nhập range chapter khi chọn số lượng chapter tùy chỉnh");
          setSaving(false);
          return;
        }
      }

      if (scheduleType === "weekly" && scheduleDays.length === 0) {
        setError("Vui lòng chọn ít nhất một ngày trong tuần");
        setSaving(false);
        return;
      }

      // Kiểm tra định dạng chapter range
      if (chapterRange) {
        const chapterRangeRegex = /^(\d+(\.\d+)?)-(\d+(\.\d+)?)$/;
        if (!chapterRangeRegex.test(chapterRange)) {
          setError("Range chapter không hợp lệ. Định dạng phải là 'start-end' (ví dụ: '1-10' hoặc '17.1-17.5')");
          setSaving(false);
          return;
        }

        // Kiểm tra start <= end
        const parts = chapterRange.split('-');
        if (parts.length === 2) {
          const start = parseFloat(parts[0] || '0');
          const end = parseFloat(parts[1] || '0');
          if (start > end) {
            setError("Range chapter không hợp lệ. Giá trị bắt đầu phải nhỏ hơn hoặc bằng giá trị kết thúc.");
            setSaving(false);
            return;
          }
        }
      }

      // Prepare data
      const finalMaxChapters = isCustomChapters ? customMaxChapters : maxChapters;

      const data: UpdateScheduledCrawlData = {
        url,
        schedule_type: scheduleType as "daily" | "weekly" | "monthly",
        schedule_time: scheduleTime,
        max_chapters: finalMaxChapters,
        delay,
        status: status as "active" | "paused" | "completed",
      };

      if (chapterRange && ((finalMaxChapters !== "all" && isCustomChapters) || maxChapters === "custom")) {
        data.chapter_range = chapterRange;
      } else if (finalMaxChapters !== "all" && !isCustomChapters && maxChapters !== "custom") {
        // Khi chọn số lượng chapter cố định (1, 5, 10, 20, 50, 100)
        data.auto_next_chapters = true;
      }

      if (scheduleType === "weekly") {
        data.schedule_days = scheduleDays.join(",");
      }

      // Call API
      await scheduledCrawlApi.updateScheduledCrawl(params.id, data);

      // Show success message
      setSuccess("Đã cập nhật lịch crawl thành công!");

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/admin/scheduled-crawls");
      }, 2000);
    } catch (err: unknown) {
      console.error("Error updating scheduled crawl:", err);
      const errorResponse = err as { response?: { status?: number, data?: { error?: string } } };

      // Kiểm tra lỗi 401 Unauthorized
      if (errorResponse.response?.status === 401) {
        setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        // Chuyển hướng đến trang đăng nhập sau 2 giây
        setTimeout(() => {
          router.push("/auth/login");
        }, 2000);
      } else {
        setError(errorResponse.response?.data?.error || "Có lỗi xảy ra khi cập nhật lịch crawl. Vui lòng thử lại sau.");
      }
    } finally {
      setSaving(false);
    }
  };

  // Render days of week checkboxes
  const renderDaysOfWeek = () => {
    const days = [
      { value: "1", label: "Thứ 2" },
      { value: "2", label: "Thứ 3" },
      { value: "3", label: "Thứ 4" },
      { value: "4", label: "Thứ 5" },
      { value: "5", label: "Thứ 6" },
      { value: "6", label: "Thứ 7" },
      { value: "7", label: "Chủ nhật" },
    ];

    return (
      <div className="flex flex-wrap gap-4 mt-2">
        {days.map((day) => (
          <label key={day.value} className="flex items-center space-x-2">
            <input
              type="checkbox"
              value={day.value}
              checked={scheduleDays.includes(day.value)}
              onChange={(e) => {
                if (e.target.checked) {
                  setScheduleDays([...scheduleDays, day.value]);
                } else {
                  setScheduleDays(scheduleDays.filter((d) => d !== day.value));
                }
              }}
              className="rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-700"
            />
            <span>{day.label}</span>
          </label>
        ))}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold mb-2">
            {loading ? "Đang tải..." : `Chỉnh sửa lịch crawl: ${scheduledCrawl?.manga_title}`}
          </h1>
          <Link
            href="/admin/scheduled-crawls"
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
          >
            Quay lại
          </Link>
        </div>
        <p className="text-gray-400">
          Chỉnh sửa cấu hình và lịch trình crawl
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

      {loading ? (
        <div className="bg-gray-800 rounded-lg p-6 flex items-center justify-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-400 ml-3">Đang tải dữ liệu...</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-300 mb-2">
                  URL Manga
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://nettruyen1905.com/manga/ta-la-ta-de"
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-gray-400 text-sm mt-1">
                  URL của trang manga cần crawl
                </p>
              </div>

              <div>
                <label className="block text-gray-300 mb-2">
                  Trạng thái
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Đang hoạt động</option>
                  <option value="paused">Tạm dừng</option>
                  <option value="completed">Hoàn thành</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 mb-2">
                  Số lượng chapter
                </label>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <select
                      value={isCustomChapters ? "custom" : maxChapters}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "custom") {
                          setIsCustomChapters(true);
                        } else {
                          setIsCustomChapters(false);
                          setMaxChapters(value);
                          // Nếu chọn "all", xóa giá trị chapterRange
                          if (value === "all") {
                            setChapterRange("");
                          }
                        }
                      }}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">Tất cả</option>
                      <option value="1">1 chapter</option>
                      <option value="5">5 chapters</option>
                      <option value="10">10 chapters</option>
                      <option value="20">20 chapters</option>
                      <option value="50">50 chapters</option>
                      <option value="100">100 chapters</option>
                      <option value="custom">Tùy chỉnh...</option>
                    </select>
                  </div>
                </div>
                {isCustomChapters && (
                  <div className="mt-2">
                    <input
                      type="number"
                      value={customMaxChapters}
                      onChange={(e) => setCustomMaxChapters(e.target.value)}
                      placeholder="Nhập số lượng chapter"
                      min="1"
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                <p className="text-gray-400 text-sm mt-1">
                  Số lượng chapter tối đa cần crawl
                </p>
              </div>

              <div>
                <label className="block text-gray-300 mb-2">
                  Range chapter
                  {isChapterRangeRequired && <span className="text-red-500 ml-1">*</span>}
                </label>
                <input
                  type="text"
                  value={chapterRange}
                  onChange={(e) => setChapterRange(e.target.value)}
                  placeholder="1-10 hoặc 17.1-17.5"
                  className={`w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isChapterRangeDisabled ? 'opacity-50' : ''}`}
                  required={isChapterRangeRequired}
                  disabled={isChapterRangeDisabled}
                />
                <p className="text-gray-400 text-sm mt-1">
                  {isChapterRangeDisabled
                    ? maxChapters === "all"
                      ? "Không cần nhập range khi chọn tất cả chapter"
                      : "Không cần nhập range khi chọn số lượng chapter cố định. Hệ thống sẽ tự động crawl từ chapter mới nhất tiếp theo."
                    : 'Range chapter cần crawl, format: &quot;start-end&quot; (ví dụ: &quot;1-10&quot;, &quot;17.1-17.5&quot;)'}
                </p>
              </div>

              <div>
                <label className="block text-gray-300 mb-2">
                  Delay giữa các request
                </label>
                <input
                  type="text"
                  value={delay}
                  onChange={(e) => setDelay(e.target.value)}
                  placeholder="3..7"
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-gray-400 text-sm mt-1">
                  Range delay giữa các request, format: &quot;min..max&quot; (đơn vị: giây)
                </p>
              </div>

              <div>
                <label className="block text-gray-300 mb-2">
                  Loại lịch
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  value={scheduleType}
                  onChange={(e) => setScheduleType(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="daily">Hàng ngày</option>
                  <option value="weekly">Hàng tuần</option>
                  <option value="monthly">Hàng tháng</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 mb-2">
                  Thời gian
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {scheduleType === "weekly" && (
              <div className="mt-6">
                <label className="block text-gray-300 mb-2">
                  Các ngày trong tuần
                  <span className="text-red-500 ml-1">*</span>
                </label>
                {renderDaysOfWeek()}
              </div>
            )}

            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center"
              >
                {saving ? (
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
                    Đang lưu...
                  </>
                ) : (
                  "Lưu thay đổi"
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
}
