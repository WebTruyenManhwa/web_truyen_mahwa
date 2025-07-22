"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "../../../components/admin/AdminSidebar";
import { adminApi } from "../../../services/api";
import dynamic from "next/dynamic";
import Link from "next/link";

// Dynamically import chart components to avoid SSR issues
const LineChart = dynamic(
  () => import("react-chartjs-2").then((mod) => mod.Line),
  { ssr: false }
);
const PieChart = dynamic(
  () => import("react-chartjs-2").then((mod) => mod.Pie),
  { ssr: false }
);
const BarChart = dynamic(
  () => import("react-chartjs-2").then((mod) => mod.Bar),
  { ssr: false }
);

// Import Chart.js components
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import React from "react";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Interfaces for analytics data
interface AnalyticsData {
  viewsOverTime: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string;
      borderColor: string;
    }[];
  };
  genreDistribution: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string[];
      borderColor: string[];
    }[];
  };
  userActivity: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string;
      borderColor: string;
    }[];
  };
  readingHabits: {
    averageReadingTime: number;
    mostActiveHour: number;
    mostActiveDay: string;
    completionRate: number;
  };
  aiInsights: {
    trendingGenres: string[];
    userBehaviorPatterns: string[];
    recommendedActions: string[];
    retentionInsights: string;
    engagementOpportunities: string;
  };
  personalizedRecommendations: {
    userId: number;
    username: string;
    favoriteGenres: string[];
    recommendedMangas: {
      id: number;
      title: string;
      coverUrl: string;
      matchScore: number;
    }[];
  }[];
}

// Default data for loading state
const defaultData: AnalyticsData = {
  viewsOverTime: {
    labels: [],
    datasets: [
      {
        label: "Lượt xem",
        data: [],
        backgroundColor: "rgba(53, 162, 235, 0.5)",
        borderColor: "rgb(53, 162, 235)",
      },
    ],
  },
  genreDistribution: {
    labels: [],
    datasets: [
      {
        label: "Phân bố thể loại",
        data: [],
        backgroundColor: [],
        borderColor: [],
      },
    ],
  },
  userActivity: {
    labels: [],
    datasets: [
      {
        label: "Hoạt động người dùng",
        data: [],
        backgroundColor: "rgba(255, 99, 132, 0.5)",
        borderColor: "rgb(255, 99, 132)",
      },
    ],
  },
  readingHabits: {
    averageReadingTime: 0,
    mostActiveHour: 0,
    mostActiveDay: "",
    completionRate: 0,
  },
  aiInsights: {
    trendingGenres: [],
    userBehaviorPatterns: [],
    recommendedActions: [],
    retentionInsights: "",
    engagementOpportunities: "",
  },
  personalizedRecommendations: [],
};

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>(defaultData);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>("week");
  const [selectedUser, setSelectedUser] = useState<number | null>(null);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);

        // Fetch real data from the API
        const data = await adminApi.getAnalytics(timeRange);

        // Transform API response to match our interface
        const transformedData: AnalyticsData = {
          viewsOverTime: data.views_over_time || defaultData.viewsOverTime,
          genreDistribution: data.genre_distribution || defaultData.genreDistribution,
          userActivity: data.user_activity || defaultData.userActivity,
          readingHabits: data.reading_habits || defaultData.readingHabits,
          aiInsights: data.ai_insights || defaultData.aiInsights,
          personalizedRecommendations: data.personalized_recommendations || defaultData.personalizedRecommendations,
        };

        setAnalyticsData(transformedData);
        setError(null);
      } catch (err) {
        console.error("Error fetching analytics data:", err);
        setError("Không thể tải dữ liệu phân tích. Vui lòng thử lại sau.");

        // In case of error, keep any existing data or use default data
        setAnalyticsData(prev =>
          Object.keys(prev).some(key =>
            Array.isArray(prev[key as keyof AnalyticsData])
              ? (prev[key as keyof AnalyticsData] as any[]).length > 0
              : prev[key as keyof AnalyticsData]
          )
            ? prev
            : defaultData
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [timeRange]);

  // Chart options
  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Lượt xem theo thời gian",
        color: "white",
      },
    },
    scales: {
      y: {
        ticks: { color: "rgba(255, 255, 255, 0.7)" },
        grid: { color: "rgba(255, 255, 255, 0.1)" },
      },
      x: {
        ticks: { color: "rgba(255, 255, 255, 0.7)" },
        grid: { color: "rgba(255, 255, 255, 0.1)" },
      },
    },
  };

  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Hoạt động người dùng theo giờ",
        color: "white",
      },
    },
    scales: {
      y: {
        ticks: { color: "rgba(255, 255, 255, 0.7)" },
        grid: { color: "rgba(255, 255, 255, 0.1)" },
      },
      x: {
        ticks: { color: "rgba(255, 255, 255, 0.7)" },
        grid: { color: "rgba(255, 255, 255, 0.1)" },
      },
    },
  };

  const pieChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "right" as const,
        labels: {
          color: "white",
        },
      },
      title: {
        display: true,
        text: "Phân bố thể loại",
        color: "white",
      },
    },
  };

  // Hiển thị trạng thái loading
  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-900">
        <AdminSidebar />
        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-400">Đang tải dữ liệu phân tích...</p>
          </div>
        </main>
      </div>
    );
  }

  // Hiển thị thông báo lỗi
  if (error) {
    return (
      <div className="flex min-h-screen bg-gray-900">
        <AdminSidebar />
        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="bg-red-900 text-red-200 p-4 rounded-lg mb-4">
              <p>{error}</p>
            </div>
            <button
              onClick={() => {
                setError(null);
                setTimeRange(prev => prev); // Trigger useEffect to refetch data
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Thử lại
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-900">
      <AdminSidebar />

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Phân tích dữ liệu</h1>
              <p className="text-gray-400">
                Thống kê chi tiết và phân tích AI về hoạt động của người dùng và nội dung
              </p>
            </div>
            <Link href="/admin/analytics/advanced" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
              Phân tích nâng cao
            </Link>
          </div>
        </div>

        {/* Time range selector */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 bg-gray-800 p-4 rounded-lg">
            <span className="text-gray-400">Khoảng thời gian:</span>
            <div className="flex space-x-2">
              <button
                onClick={() => setTimeRange("day")}
                className={`px-3 py-1 rounded ${
                  timeRange === "day"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
                disabled={loading}
              >
                Ngày
              </button>
              <button
                onClick={() => setTimeRange("week")}
                className={`px-3 py-1 rounded ${
                  timeRange === "week"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
                disabled={loading}
              >
                Tuần
              </button>
              <button
                onClick={() => setTimeRange("month")}
                className={`px-3 py-1 rounded ${
                  timeRange === "month"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
                disabled={loading}
              >
                Tháng
              </button>
              <button
                onClick={() => setTimeRange("year")}
                className={`px-3 py-1 rounded ${
                  timeRange === "year"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
                disabled={loading}
              >
                Năm
              </button>
            </div>
            {loading && (
              <div className="flex items-center ml-4">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                <span className="text-sm text-gray-400">Đang tải...</span>
              </div>
            )}
          </div>
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Line Chart - Views over time */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <div style={{ height: "300px" }}>
              <LineChart data={analyticsData.viewsOverTime} options={lineChartOptions} />
            </div>
          </div>

          {/* Pie Chart - Genre distribution */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <div style={{ height: "300px" }}>
              <PieChart data={analyticsData.genreDistribution} options={pieChartOptions} />
            </div>
          </div>

          {/* Bar Chart - User activity by hour */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <div style={{ height: "300px" }}>
              <BarChart data={analyticsData.userActivity} options={barChartOptions} />
            </div>
          </div>

          {/* Reading habits stats */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Thói quen đọc truyện</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-700 p-4 rounded-lg">
                <p className="text-gray-400 text-sm mb-1">Thời gian đọc trung bình</p>
                <p className="text-2xl font-bold">{analyticsData.readingHabits.averageReadingTime} phút</p>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg">
                <p className="text-gray-400 text-sm mb-1">Giờ hoạt động nhiều nhất</p>
                <p className="text-2xl font-bold">{analyticsData.readingHabits.mostActiveHour}:00</p>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg">
                <p className="text-gray-400 text-sm mb-1">Ngày hoạt động nhiều nhất</p>
                <p className="text-2xl font-bold">{analyticsData.readingHabits.mostActiveDay}</p>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg">
                <p className="text-gray-400 text-sm mb-1">Tỷ lệ đọc hoàn thành</p>
                <p className="text-2xl font-bold">{analyticsData.readingHabits.completionRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Phân tích AI</h2>
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Xu hướng thể loại</h3>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <ul className="space-y-2">
                    {analyticsData.aiInsights.trendingGenres.map((genre, index) => (
                      <li key={index} className="flex items-center">
                        <span className="w-6 h-6 flex items-center justify-center bg-blue-600 rounded-full text-xs mr-2">
                          {index + 1}
                        </span>
                        {genre}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Mẫu hành vi người dùng</h3>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <ul className="space-y-2">
                    {analyticsData.aiInsights.userBehaviorPatterns.map((pattern, index) => (
                      <li key={index} className="flex items-start">
                        <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        {pattern}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Đề xuất hành động</h3>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <ul className="space-y-2">
                    {analyticsData.aiInsights.recommendedActions.map((action, index) => (
                      <li key={index} className="flex items-start">
                        <svg className="w-5 h-5 text-green-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                        </svg>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Phân tích chuyên sâu</h3>
                <div className="bg-gray-700 p-4 rounded-lg space-y-4">
                  <div>
                    <p className="text-sm text-gray-400">Giữ chân người dùng</p>
                    <p>{analyticsData.aiInsights.retentionInsights}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Cơ hội tăng tương tác</p>
                    <p>{analyticsData.aiInsights.engagementOpportunities}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Personalized Recommendations */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Đề xuất cá nhân hóa</h2>

          {/* User selector */}
          <div className="mb-4">
            <select
              value={selectedUser || ""}
              onChange={(e) => setSelectedUser(e.target.value ? Number(e.target.value) : null)}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg w-full md:w-auto"
            >
              <option value="">Chọn người dùng</option>
              {analyticsData.personalizedRecommendations.map((user) => (
                <option key={user.userId} value={user.userId}>
                  {user.username}
                </option>
              ))}
            </select>
          </div>

          {selectedUser ? (
            <div className="bg-gray-800 p-6 rounded-lg">
              {analyticsData.personalizedRecommendations
                .filter((rec) => rec.userId === selectedUser)
                .map((userRec) => (
                  <div key={userRec.userId}>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold">Thể loại yêu thích</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {userRec.favoriteGenres.map((genre, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-blue-900 text-blue-200 rounded-full text-sm"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold mb-3">Truyện đề xuất</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {userRec.recommendedMangas.map((manga) => (
                        <div key={manga.id} className="bg-gray-700 rounded-lg overflow-hidden">
                          <div className="h-40 bg-gray-600 flex items-center justify-center">
                            {/* Placeholder for manga cover */}
                            <svg
                              className="w-12 h-12 text-gray-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              ></path>
                            </svg>
                          </div>
                          <div className="p-4">
                            <h4 className="font-semibold mb-1">{manga.title}</h4>
                            <div className="flex items-center">
                              <div className="flex-1 bg-gray-600 rounded-full h-2">
                                <div
                                  className="bg-green-500 h-2 rounded-full"
                                  style={{ width: `${manga.matchScore}%` }}
                                ></div>
                              </div>
                              <span className="ml-2 text-sm text-green-400">{manga.matchScore}%</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Độ phù hợp</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="bg-gray-800 p-6 rounded-lg text-center">
              <p className="text-gray-400">Vui lòng chọn người dùng để xem đề xuất cá nhân hóa</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
