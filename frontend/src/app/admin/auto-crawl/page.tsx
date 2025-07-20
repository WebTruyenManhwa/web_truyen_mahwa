"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "../../../components/admin/AdminLayout";
import { proxyApi, mangaApi } from "../../../services/api";

interface Manga {
  id: number;
  title: string;
  slug: string;
  coverImage?: string;
}

export default function AutoCrawlManga() {
  const router = useRouter();
  // Xóa biến không sử dụng _mangas
  const [, setMangas] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [crawlStarted, setCrawlStarted] = useState<boolean>(false);

  // Form state
  // Xóa biến không sử dụng _selectedMangaId và _setSelectedMangaId
  const [url, setUrl] = useState("");
  const [maxChapters, setMaxChapters] = useState<string>("all");
  const [customMaxChapters, setCustomMaxChapters] = useState<string>("");
  const [isCustomChapters, setIsCustomChapters] = useState<boolean>(false);
  const [chapterRange, setChapterRange] = useState<string>("");
  const [delay, setDelay] = useState<string>("3..7");
  const [isScheduled, setIsScheduled] = useState<boolean>(false);
  const [scheduleType, setScheduleType] = useState<string>("daily");
  const [scheduleTime, setScheduleTime] = useState<string>("03:00");
  const [scheduleDays, setScheduleDays] = useState<string[]>(["1"]);

  // Determine if chapter range is required
  const isChapterRangeRequired = maxChapters !== "all" || isCustomChapters;
  // Determine if chapter range input should be disabled
  const isChapterRangeDisabled = maxChapters === "all" && !isCustomChapters;

  // Fetch mangas for dropdown
  useEffect(() => {
    const fetchMangas = async () => {
      try {
        setLoading(true);
        const response = await mangaApi.getMangas({ limit: 100 });
        setMangas(response.mangas || []);
      } catch (err) {
        console.error("Error fetching mangas:", err);
        setError("Không thể tải danh sách truyện. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    fetchMangas();
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setInfoMessage(null);
      setJobId(null);
      setCrawlStarted(false);

      // Validate form
      if (!url) {
        setError("Vui lòng nhập URL của manga");
        setLoading(false);
        return;
      }

      const finalMaxChapters = isCustomChapters ? customMaxChapters : maxChapters;

      if (finalMaxChapters !== "all" && !chapterRange) {
        setError("Vui lòng nhập range chapter khi số lượng chapter không phải 'all'");
        setLoading(false);
        return;
      }

      // Prepare options
      const options: Record<string, unknown> = {
        max_chapters: finalMaxChapters,
        delay: delay,
      };

      if (chapterRange && finalMaxChapters !== "all") {
        options.chapter_range = chapterRange;
      }

      if (isScheduled) {
        options.schedule = true;
        options.schedule_type = scheduleType;
        options.schedule_time = scheduleTime;

        if (scheduleType === "weekly") {
          options.schedule_days = scheduleDays.join(",");
        }
      }

      // Hiển thị thông báo về cách hệ thống xử lý truyện đã tồn tại
      setInfoMessage(
        "Hệ thống sẽ kiểm tra nếu truyện đã tồn tại dựa trên tên truyện. " +
        "Nếu truyện đã tồn tại, hệ thống sẽ sử dụng truyện đó. " +
        "Các chapter đã tồn tại sẽ được bỏ qua trong quá trình crawl."
      );

      // Call API
      const response = await proxyApi.crawlManga(url, options);

      // Lưu job ID nếu có
      if (response?.job_id) {
        setJobId(response.job_id);
        setCrawlStarted(true);
        setSuccess("Đã bắt đầu crawl manga. Quá trình này có thể mất vài phút. Bạn có thể theo dõi tiến trình ở trang Scheduled Jobs.");
      } else {
        // Show success message
        setSuccess(isScheduled
          ? "Đã lên lịch crawl thành công!"
          : "Đã bắt đầu crawl manga. Quá trình này có thể mất vài phút. Bạn có thể theo dõi tiến trình ở trang Scheduled Jobs.");
      }

      // Redirect to scheduled crawls if scheduled
      if (isScheduled) {
        setTimeout(() => {
          router.push("/admin/scheduled-crawls");
        }, 2000);
      }
    } catch (err: unknown) {
      console.error("Error crawling manga:", err);

      // Xử lý lỗi source_url
      const errorResponse = err as { response?: { data?: { error?: string } } };
      if (errorResponse.response?.data?.error?.includes('source_url')) {
        setError("Lỗi: Thuộc tính 'source_url' không tồn tại trong model Manga. Vui lòng liên hệ developer để thêm trường này vào database.");
      } else {
        setError(errorResponse.response?.data?.error || "Có lỗi xảy ra khi crawl manga. Vui lòng thử lại sau.");
      }
    } finally {
      setLoading(false);
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

  // Chuyển đến trang Scheduled Jobs để xem tiến trình
  const goToScheduledCrawls = () => {
    router.push("/admin/scheduled-crawls");
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Auto Crawl Manga</h1>
        <p className="text-gray-400">
          Tự động crawl manga từ các trang web nguồn
        </p>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-100 px-4 py-3 rounded-lg mb-6">
          <div className="font-bold mb-1">Lỗi:</div>
          <div>{error}</div>
          {error.includes('source_url') && (
            <div className="mt-2 text-sm">
              <p className="font-semibold">Hướng dẫn khắc phục:</p>
              <ol className="list-decimal pl-5 mt-1">
                <li>Thêm trường source_url vào model Manga bằng cách chạy migration:</li>
                <pre className="bg-red-950 p-2 mt-1 rounded">
                  rails g migration AddSourceUrlToMangas source_url:string
                </pre>
                <li>Sau đó chạy migrate database:</li>
                <pre className="bg-red-950 p-2 mt-1 rounded">
                  rails db:migrate
                </pre>
              </ol>
            </div>
          )}
        </div>
      )}

      {success && (
        <div className="bg-green-900/50 border border-green-500 text-green-100 px-4 py-3 rounded-lg mb-6">
          <div>{success}</div>
          {crawlStarted && !isScheduled && (
            <div className="mt-3">
              <button
                onClick={goToScheduledCrawls}
                className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm"
              >
                Xem tiến trình crawl
              </button>

              <div className="mt-2 text-sm">
                <p>Lưu ý: Hệ thống sẽ tự động gửi thông báo khi quá trình crawl hoàn tất hoặc khi có lỗi.</p>
                <p>Job ID: <span className="font-mono bg-green-800/50 px-1 rounded">{jobId}</span></p>
              </div>
            </div>
          )}
        </div>
      )}

      {infoMessage && (
        <div className="bg-blue-900/50 border border-blue-500 text-blue-100 px-4 py-3 rounded-lg mb-6">
          {infoMessage}
        </div>
      )}

      <div className="bg-gray-800 rounded-lg p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-300 mb-2">
                URL Manga
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://nettruyen1905.com/manga/ta-la-ta-de"
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-gray-400 text-sm mt-1">
                URL của trang manga cần crawl
              </p>
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
                placeholder="1-10"
                className={`w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isChapterRangeDisabled ? 'opacity-50' : ''}`}
                required={isChapterRangeRequired}
                disabled={isChapterRangeDisabled}
              />
              <p className="text-gray-400 text-sm mt-1">
                {isChapterRangeDisabled
                  ? "Không cần nhập range khi chọn tất cả chapter"
                  : 'Range chapter cần crawl, format: &quot;start-end&quot; (ví dụ: &quot;1-10&quot;)'}
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
          </div>

          <div className="mt-8">
            <label className="flex items-center space-x-2 mb-4">
              <input
                type="checkbox"
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
                className="rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-700"
              />
              <span className="text-gray-300">Lên lịch crawl tự động</span>
            </label>

            {isScheduled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 p-4 border border-gray-700 rounded-lg">
                <div>
                  <label className="block text-gray-300 mb-2">
                    Loại lịch
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    value={scheduleType}
                    onChange={(e) => setScheduleType(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={isScheduled}
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
                    required={isScheduled}
                  />
                </div>

                {scheduleType === "weekly" && (
                  <div className="col-span-2">
                    <label className="block text-gray-300 mb-2">
                      Các ngày trong tuần
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    {renderDaysOfWeek()}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-gray-900/50 border border-gray-700 rounded-lg">
            <h3 className="text-lg font-medium text-gray-200 mb-2">Lưu ý quan trọng:</h3>
            <ul className="list-disc pl-5 text-gray-300 space-y-1">
              <li>Hệ thống sẽ tự động kiểm tra truyện đã tồn tại dựa trên tên truyện.</li>
              <li>Nếu truyện <strong>chưa tồn tại</strong> trong hệ thống, hệ thống sẽ tự động tạo mới truyện với đầy đủ thông tin:</li>
              <ul className="list-circle pl-5 text-gray-300 space-y-1 mt-1 mb-2">
                <li>Tiêu đề, mô tả, tác giả, trạng thái từ trang nguồn</li>
                <li>Tự động tải và đính kèm ảnh bìa</li>
                <li>Tự động thêm các thể loại liên quan</li>
              </ul>
              <li>Nếu truyện <strong>đã tồn tại</strong> trong hệ thống, hệ thống sẽ sử dụng truyện đó thay vì tạo mới.</li>
              <li>Các chapter đã tồn tại sẽ được bỏ qua trong quá trình crawl.</li>
              <li>Chỉ các chapter mới sẽ được thêm vào truyện.</li>
            </ul>
          </div>

          <div className="mt-6 p-4 bg-gray-900/50 border border-amber-700 rounded-lg">
            <h3 className="text-lg font-medium text-amber-200 mb-2">Xử lý lỗi khi crawl:</h3>
            <ul className="list-disc pl-5 text-gray-300 space-y-1">
              <li>Hệ thống xử lý từng chapter một cách độc lập, nếu một chapter gặp lỗi:</li>
              <ul className="list-circle pl-5 text-gray-300 space-y-1 mt-1 mb-2">
                <li>Hệ thống sẽ <strong>bỏ qua chapter đó</strong> và tiếp tục crawl các chapter khác</li>
                <li>Lỗi của chapter sẽ được ghi lại trong kết quả crawl</li>
                <li>Quá trình crawl <strong>không bị dừng lại</strong> khi gặp lỗi ở một chapter</li>
              </ul>
              <li>Trong trường hợp lỗi nghiêm trọng (server bị tắt, mất kết nối...):</li>
              <ul className="list-circle pl-5 text-gray-300 space-y-1 mt-1 mb-2">
                <li>Hệ thống sẽ tự động thử lại job tối đa 3 lần</li>
                <li>Mỗi lần thử lại sẽ cách nhau một khoảng thời gian tăng dần</li>
                <li>Thông báo lỗi sẽ được gửi đến admin qua hệ thống thông báo</li>
              </ul>
              <li>Admin có thể xem chi tiết lỗi và trạng thái của các job crawl tại:</li>
              <ul className="list-circle pl-5 text-gray-300 space-y-1 mt-1 mb-2">
                <li>Trang <a href="/admin/scheduled-jobs" className="text-blue-400 hover:underline">Quản lý Scheduled Jobs</a></li>
                <li>Trang này hiển thị đầy đủ thông tin về các job, bao gồm lỗi gặp phải và trạng thái</li>
                <li>Admin có thể thử lại các job đã thất bại hoặc hủy các job đang chờ</li>
              </ul>
            </ul>
          </div>

          <div className="mt-6 p-4 bg-gray-900/50 border border-blue-700 rounded-lg">
            <h3 className="text-lg font-medium text-blue-200 mb-2">Theo dõi tiến trình crawl:</h3>
            <ul className="list-disc pl-5 text-gray-300 space-y-1">
              <li>Sau khi bắt đầu crawl, hệ thống sẽ gửi thông báo khi:</li>
              <ul className="list-circle pl-5 text-gray-300 space-y-1 mt-1 mb-2">

                <li>Quá trình crawl hoàn tất thành công</li>
                <li>Xảy ra lỗi trong quá trình crawl</li>
              </ul>
              <li>Bạn có thể xem thông báo tại:</li>
              <ul className="list-circle pl-5 text-gray-300 space-y-1 mt-1 mb-2">
                <li>Trang thông báo của admin</li>
                <li>Email (nếu đã cấu hình)</li>
              </ul>
              <li>Để kiểm tra kết quả crawl:</li>
              <ul className="list-circle pl-5 text-gray-300 space-y-1 mt-1 mb-2">
                <li>Truy cập trang quản lý manga để xem truyện đã được tạo/cập nhật</li>
                <li>Truy cập trang chi tiết manga để xem các chapter đã được thêm vào</li>
              </ul>
            </ul>
          </div>

          <div className="mt-8 flex justify-end">
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
              ) : isScheduled ? (
                "Lên lịch crawl"
              ) : (
                "Bắt đầu crawl"
              )}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
