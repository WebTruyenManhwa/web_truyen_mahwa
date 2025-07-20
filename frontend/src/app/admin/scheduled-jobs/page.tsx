"use client";

import React, { useState, useEffect } from "react";
import AdminLayout from "../../../components/admin/AdminLayout";
import { scheduledJobApi } from "../../../services/api";

interface ScheduledJob {
  id: number;
  job_type: string;
  status: string;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  options: string;
  result: string | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  parent_job_id: number | null;
  created_at: string;
  updated_at: string;
}

interface JobStats {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  due: number;
  by_job_type: Record<string, number>;
}

export default function ScheduledJobs() {
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [stats, setStats] = useState<JobStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedJobType, setSelectedJobType] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedJob, setSelectedJob] = useState<ScheduledJob | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Fetch jobs
  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {
        page: currentPage,
        per_page: 20
      };

      if (selectedJobType) {
        params.job_type = selectedJobType;
      }

      if (selectedStatus) {
        params.status = selectedStatus;
      }

      const response = await scheduledJobApi.getScheduledJobs(params);

      // Đảm bảo dữ liệu trả về từ API được xử lý đúng cách
      const jobsData = response.scheduled_jobs || [];

      // Chuẩn hóa dữ liệu jobs
      const normalizedJobs = jobsData.map((job: Record<string, unknown>) => ({
        ...job,
        options: typeof job.options === 'string' ? job.options : JSON.stringify(job.options || {}),
        result: job.result === null ? null :
                typeof job.result === 'string' ? job.result : JSON.stringify(job.result || null),
        error_message: job.error_message || null,
        started_at: job.started_at || null,
        completed_at: job.completed_at || null,
        retry_count: job.retry_count || 0,
        max_retries: job.max_retries || 0
      }));

      setJobs(normalizedJobs);
      setTotalPages(response.meta?.total_pages || 1);
    } catch (err) {
      console.error("Error fetching scheduled jobs:", err);
      setError("Không thể tải danh sách jobs. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await scheduledJobApi.getJobStats();

      // Kiểm tra dữ liệu trả về có đúng định dạng không
      if (response && response.stats && typeof response.stats === 'object') {
        // Đảm bảo tất cả các trường cần thiết đều tồn tại
        const defaultStats: JobStats = {
          total: 0,
          pending: 0,
          running: 0,
          completed: 0,
          failed: 0,
          due: 0,
          by_job_type: {}
        };

        // Merge với dữ liệu trả về từ API
        setStats({
          ...defaultStats,
          ...response.stats
        });
      } else {
        console.error("Invalid stats data format:", response);
        setStats(null);
      }
    } catch (err) {
      console.error("Error fetching job stats:", err);
      setStats(null);
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, selectedJobType, selectedStatus]);

  // Format job type
  const formatJobType = (type: string) => {
    switch (type) {
      case "scheduled_crawl_check":
        return "Kiểm tra lịch crawl";
      case "single_job":
        return "Job đơn lẻ";
      default:
        return type;
    }
  };

  // Format status
  const formatStatus = (status: string) => {
    switch (status) {
      case "pending":
        return "Đang chờ";
      case "running":
        return "Đang chạy";
      case "completed":
        return "Hoàn thành";
      case "failed":
        return "Thất bại";
      default:
        return status;
    }
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("vi-VN");
  };

  // Handle retry
  const handleRetry = async (id: number) => {
    try {
      setLoading(true);
      await scheduledJobApi.retryJob(id);
      setSuccess("Đã lên lịch chạy lại job thành công.");
      fetchJobs();
      fetchStats();
    } catch (err: unknown) {
      console.error("Error retrying job:", err);
      const errorResponse = err as { response?: { data?: { error?: string } } };
      setError(errorResponse.response?.data?.error || "Có lỗi xảy ra khi chạy lại job. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel
  const handleCancel = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn hủy job này không?")) {
      return;
    }

    try {
      setLoading(true);
      await scheduledJobApi.cancelJob(id);
      setSuccess("Đã hủy job thành công.");
      fetchJobs();
      fetchStats();
    } catch (err: unknown) {
      console.error("Error canceling job:", err);
      const errorResponse = err as { response?: { data?: { error?: string } } };
      setError(errorResponse.response?.data?.error || "Có lỗi xảy ra khi hủy job. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  // Show job details
  const showJobDetails = (job: ScheduledJob) => {
    // Đảm bảo tất cả các trường của job đều có giá trị hợp lệ
    const safeJob = {
      ...job,
      options: job.options || '{}',
      result: job.result || null,
      error_message: job.error_message || null,
      started_at: job.started_at || null,
      completed_at: job.completed_at || null
    };

    setSelectedJob(safeJob);
    setShowModal(true);
  };

  // Format options
  const formatOptions = (options: string) => {
    if (!options) return "Không có options";

    try {
      const parsedOptions = JSON.parse(options);
      return JSON.stringify(parsedOptions, null, 2);
    } catch {
      return String(options);
    }
  };

  // Format result
  const formatResult = (result: string | null) => {
    if (!result) return "Không có kết quả";

    try {
      const parsedResult = JSON.parse(result);
      return JSON.stringify(parsedResult, null, 2);
    } catch {
      return String(result);
    }
  };

  // Render pagination
  const renderPagination = () => {
    const pages: React.ReactElement[] = [];
    const maxPagesToShow = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          className={`px-3 py-1 rounded-md ${
            currentPage === i
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="flex justify-center mt-6 space-x-2">
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded-md bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50"
        >
          &laquo;
        </button>
        {pages}
        <button
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded-md bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50"
        >
          &raquo;
        </button>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Quản lý Scheduled Jobs</h1>
        <p className="text-gray-400">
          Theo dõi và quản lý các jobs đã lên lịch trong hệ thống
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

      {stats && typeof stats.total === 'number' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Tổng số jobs</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Đang chờ</div>
            <div className="text-2xl font-bold text-blue-400">{stats.pending}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Đang chạy</div>
            <div className="text-2xl font-bold text-yellow-400">{stats.running}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Hoàn thành</div>
            <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Thất bại</div>
            <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label className="text-gray-300 block mb-2">Loại job:</label>
          <select
            value={selectedJobType}
            onChange={(e) => {
              setSelectedJobType(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả</option>
            <option value="scheduled_crawl_check">Kiểm tra lịch crawl</option>
            <option value="single_job">Job đơn lẻ</option>
          </select>
        </div>

        <div>
          <label className="text-gray-300 block mb-2">Trạng thái:</label>
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả</option>
            <option value="pending">Đang chờ</option>
            <option value="running">Đang chạy</option>
            <option value="completed">Hoàn thành</option>
            <option value="failed">Thất bại</option>
          </select>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg overflow-hidden">
        {loading && jobs.length === 0 ? (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-400">Đang tải dữ liệu...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-400">Không có jobs nào phù hợp với điều kiện lọc.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-700">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Loại job
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Lên lịch lúc
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Bắt đầu lúc
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Hoàn thành lúc
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Số lần retry
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => showJobDetails(job)}
                        className="text-blue-400 hover:underline"
                      >
                        #{job.id}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatJobType(job.job_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          job.status === "completed"
                            ? "bg-green-900 text-green-300"
                            : job.status === "running"
                            ? "bg-yellow-900 text-yellow-300"
                            : job.status === "failed"
                            ? "bg-red-900 text-red-300"
                            : "bg-blue-900 text-blue-300"
                        }`}
                      >
                        {formatStatus(job.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                      {formatDate(job.scheduled_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                      {formatDate(job.started_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                      {formatDate(job.completed_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                      {job.retry_count}/{job.max_retries}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => showJobDetails(job)}
                          className="text-blue-500 hover:text-blue-400"
                          title="Chi tiết"
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
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </button>

                        {job.status === "failed" && (
                          <button
                            onClick={() => handleRetry(job.id)}
                            className="text-green-500 hover:text-green-400"
                            title="Chạy lại"
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
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                              />
                            </svg>
                          </button>
                        )}

                        {job.status === "pending" && (
                          <button
                            onClick={() => handleCancel(job.id)}
                            className="text-red-500 hover:text-red-400"
                            title="Hủy"
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
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && renderPagination()}

      {/* Modal for job details */}
      {showModal && selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">
                  Chi tiết Job #{selectedJob.id}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-gray-400 mb-1">Loại job:</p>
                  <p>{formatJobType(selectedJob.job_type)}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Trạng thái:</p>
                  <p>
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        selectedJob.status === "completed"
                          ? "bg-green-900 text-green-300"
                          : selectedJob.status === "running"
                          ? "bg-yellow-900 text-yellow-300"
                          : selectedJob.status === "failed"
                          ? "bg-red-900 text-red-300"
                          : "bg-blue-900 text-blue-300"
                      }`}
                    >
                      {formatStatus(selectedJob.status)}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Lên lịch lúc:</p>
                  <p>{formatDate(selectedJob.scheduled_at)}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Bắt đầu lúc:</p>
                  <p>{formatDate(selectedJob.started_at)}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Hoàn thành lúc:</p>
                  <p>{formatDate(selectedJob.completed_at)}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Số lần retry:</p>
                  <p>
                    {selectedJob.retry_count}/{selectedJob.max_retries}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-400 mb-1">Options:</p>
                <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
                  {formatOptions(selectedJob.options || '{}')}
                </pre>
              </div>

              {selectedJob.result && (
                <div className="mb-6">
                  <p className="text-gray-400 mb-1">Kết quả:</p>
                  <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
                    {formatResult(selectedJob.result)}
                  </pre>
                </div>
              )}

              {selectedJob.error_message && (
                <div className="mb-6">
                  <p className="text-gray-400 mb-1">Lỗi:</p>
                  <pre className="bg-red-900/30 text-red-100 p-4 rounded-lg overflow-x-auto text-sm">
                    {selectedJob.error_message || 'Không có thông tin lỗi'}
                  </pre>
                </div>
              )}

              <div className="flex justify-end space-x-2 mt-6">
                {selectedJob.status === "failed" && (
                  <button
                    onClick={() => {
                      handleRetry(selectedJob.id);
                      setShowModal(false);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                  >
                    Chạy lại
                  </button>
                )}
                {selectedJob.status === "pending" && (
                  <button
                    onClick={() => {
                      handleCancel(selectedJob.id);
                      setShowModal(false);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                  >
                    Hủy
                  </button>
                )}
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
