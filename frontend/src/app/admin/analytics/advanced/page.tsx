"use client";

import { useState, useEffect, useRef } from "react";
import AdminSidebar from "../../../../components/admin/AdminSidebar";
import { adminApi } from "../../../../services/api";
import dynamic from "next/dynamic";
import Link from "next/link";
import { userApi } from "../../../../services/api"; // Added import for userApi

// Dynamically import chart components
const LineChart = dynamic(
  () => import("react-chartjs-2").then((mod) => mod.Line),
  { ssr: false }
);
const BarChart = dynamic(
  () => import("react-chartjs-2").then((mod) => mod.Bar),
  { ssr: false }
);
const PieChart = dynamic(
  () => import("react-chartjs-2").then((mod) => mod.Pie),
  { ssr: false }
);

// Import for Google Maps
const Map = dynamic(
  () => import("../../../../components/Map").then((mod) => mod.default),
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

// Interfaces for advanced analytics data
interface AdvancedAnalyticsData {
  genre_trends: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string;
      borderColor: string;
      tension?: number;
    }[];
  };
  dropoff_rate: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string;
      borderColor: string;
    }[];
  };
  user_segments: {
    segments: {
      name: string;
      criteria: string;
      percentage: number;
      characteristics: string[];
    }[];
    chartData: {
      labels: string[];
      datasets: {
        label: string;
        data: number[];
        backgroundColor: string[];
        borderColor: string[];
      }[];
    };
  };
  traffic_sources: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string[];
      borderColor: string[];
    }[];
  };
  kpis: {
    kpis: {
      dau: number;
      mau: number;
      dau_mau_ratio: number;
      retention: {
        day_1: number;
        day_7: number;
        day_30: number;
      };
      session: {
        avg_length: number;
        avg_chapters: number;
        daily_sessions_per_user: number;
      };
    };
    retentionChart: {
      labels: string[];
      datasets: {
        label: string;
        data: number[];
        backgroundColor: string;
        borderColor: string;
      }[];
    };
  };
  geo_data: {
    regions: {
      name: string;
      value: number;
      lat: number;
      lng: number;
    }[];
    center: {
      lat: number;
      lng: number;
    };
  };
}

// Default data for loading state
const defaultData: AdvancedAnalyticsData = {
  genre_trends: {
    labels: [],
    datasets: []
  },
  dropoff_rate: {
    labels: [],
    datasets: [{
      label: "Tỷ lệ người dùng rời truyện",
      data: [],
      backgroundColor: "rgba(255, 99, 132, 0.5)",
      borderColor: "rgb(255, 99, 132)"
    }]
  },
  user_segments: {
    segments: [],
    chartData: {
      labels: [],
      datasets: [{
        label: "Phân bố người dùng",
        data: [],
        backgroundColor: [],
        borderColor: []
      }]
    }
  },
  traffic_sources: {
    labels: [],
    datasets: [{
      label: "Nguồn truy cập",
      data: [],
      backgroundColor: [],
      borderColor: []
    }]
  },
  kpis: {
    kpis: {
      dau: 0,
      mau: 0,
      dau_mau_ratio: 0,
      retention: {
        day_1: 0,
        day_7: 0,
        day_30: 0
      },
      session: {
        avg_length: 0,
        avg_chapters: 0,
        daily_sessions_per_user: 0
      }
    },
    retentionChart: {
      labels: [],
      datasets: [{
        label: "Tỷ lệ giữ chân người dùng",
        data: [],
        backgroundColor: "rgba(54, 162, 235, 0.5)",
        borderColor: "rgb(54, 162, 235)"
      }]
    }
  },
  geo_data: {
    regions: [],
    center: { lat: 16.0544, lng: 108.0717 }
  }
};

// Tạo các thành phần biểu đồ tối ưu hóa với React.memo
const LineChartMemo = React.memo(({ data, options }: { data: any, options: any }) => {
  return <LineChart data={data} options={options} />;
});
LineChartMemo.displayName = 'LineChartMemo';

const BarChartMemo = React.memo(({ data, options }: { data: any, options: any }) => {
  return <BarChart data={data} options={options} />;
});
BarChartMemo.displayName = 'BarChartMemo';

const PieChartMemo = React.memo(({ data, options }: { data: any, options: any }) => {
  return <PieChart data={data} options={options} />;
});
PieChartMemo.displayName = 'PieChartMemo';

// KPI Card component để tái sử dụng
const KpiCard = React.memo(({ title, value, subtitle }: { title: string, value: string | number, subtitle?: string }) => (
  <div className="bg-gray-700 p-3 rounded-lg">
    <p className="text-gray-400 text-sm">{title}</p>
    <p className="text-2xl font-bold">{value}</p>
    {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
  </div>
));
KpiCard.displayName = 'KpiCard';

export default function AdvancedAnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AdvancedAnalyticsData>(defaultData);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>("week");
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [aiResponse, setAiResponse] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [promptType, setPromptType] = useState<string>("general");
  const [userPrompt, setUserPrompt] = useState<string>("");
  const chatboxRef = useRef<HTMLDivElement>(null);
  // Thêm state lưu lịch sử chat
  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([]);
  // Thêm state kiểm tra quyền truy cập
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [userChecked, setUserChecked] = useState<boolean>(false);

  // Kiểm tra quyền truy cập
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const userData = await userApi.getCurrentUser();
        setIsSuperAdmin(userData.role === 'super_admin');
        setUserChecked(true);
      } catch (err) {
        console.error("Error checking user role:", err);
        setError("Không thể xác minh quyền truy cập. Vui lòng thử lại sau.");
        setUserChecked(true);
      }
    };

    checkUserRole();
  }, []);

  useEffect(() => {
    // Chỉ tải dữ liệu nếu là super_admin
    if (userChecked && isSuperAdmin) {
      const fetchAdvancedAnalyticsData = async () => {
        try {
          setLoading(true);
          const data = await adminApi.getAdvancedAnalytics(timeRange);
          setAnalyticsData(data);
          setError(null);
        } catch (err) {
          console.error("Error fetching advanced analytics data:", err);
          setError("Không thể tải dữ liệu phân tích nâng cao. Vui lòng thử lại sau.");
        } finally {
          setLoading(false);
        }
      };

      fetchAdvancedAnalyticsData();
    }
  }, [timeRange, userChecked, isSuperAdmin]);

  // Thêm useEffect để xử lý việc chuyển tab
  useEffect(() => {
    // Clear chat cũ ngay khi chuyển tab
    setAiPrompt("");
    setAiResponse("");
    setUserPrompt("");
  }, [promptType]);

  useEffect(() => {
    // Chỉ tải prompt khi không phải tab "Chat với AI" và là super_admin
    if (promptType !== "chat" && userChecked && isSuperAdmin) {
      const fetchAiPrompt = async () => {
        try {
          // Hiển thị trạng thái loading
          setAiLoading(true);

          const data = await adminApi.getAIPrompt(promptType);

          // Debug response
          console.log(`Tab ${promptType} AI Prompt Response:`, data);

          setAiPrompt(data.prompt);
          // Hiển thị phản hồi từ API nếu có
          if (data.response) {
            setAiResponse(data.response);
          } else {
            setAiResponse("");
          }
          setUserPrompt("");
        } catch (err) {
          console.error("Error fetching AI prompt:", err);
          setAiPrompt("");
          setAiResponse("");
        } finally {
          // Kết thúc trạng thái loading
          setAiLoading(false);
        }
      };

      fetchAiPrompt();
    } else if (promptType === "chat") {
      // Không reset chatHistory để giữ lịch sử chat
    }
  }, [promptType, userChecked, isSuperAdmin]);

  const handleAskAI = async () => {
    // Kiểm tra quyền truy cập
    if (!isSuperAdmin) {
      alert("Bạn không có quyền sử dụng tính năng này.");
      return;
    }

    if (!userPrompt.trim()) {
      alert("Vui lòng nhập câu hỏi hoặc yêu cầu phân tích");
      return;
    }

    setAiLoading(true);
    try {
      // Lưu câu hỏi hiện tại để hiển thị trong khung chat
      const currentPrompt = userPrompt;

      // Thêm câu hỏi của người dùng vào lịch sử chat
      if (promptType === "chat") {
        setChatHistory(prev => [...prev, {role: "user", content: currentPrompt}]);
      }

      const data = await adminApi.getAIPrompt(promptType, userPrompt);

      // Debug response
      console.log("AI Response:", data);

      // Hiển thị câu hỏi và phản hồi
      setAiResponse(data.response);

      // Thêm phản hồi của AI vào lịch sử chat
      if (promptType === "chat") {
        setChatHistory(prev => [...prev, {role: "ai", content: data.response}]);
      }

      // Scroll to bottom of chatbox
      if (chatboxRef.current) {
        chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
      }

      // Xóa nội dung input sau khi gửi
      setUserPrompt("");
    } catch (err) {
      console.error("Error getting AI analysis:", err);
      setAiResponse("Xin lỗi, có lỗi xảy ra khi phân tích dữ liệu. Vui lòng thử lại sau.");

      // Thêm thông báo lỗi vào lịch sử chat
      if (promptType === "chat") {
        setChatHistory(prev => [...prev, {
          role: "ai",
          content: "Xin lỗi, có lỗi xảy ra khi phân tích dữ liệu. Vui lòng thử lại sau."
        }]);
      }
    } finally {
      setAiLoading(false);
    }
  };

  // Chart options
  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Xu hướng theo thể loại",
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
        text: "Tỷ lệ rời truyện theo chapter",
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
        text: "Phân khúc người dùng",
        color: "white",
      },
    },
  };

  // Hiển thị trạng thái loading
  if (loading && userChecked && isSuperAdmin) {
    return (
      <div className="flex min-h-screen bg-gray-900">
        <AdminSidebar />
        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-400">Đang tải dữ liệu phân tích nâng cao...</p>
          </div>
        </main>
      </div>
    );
  }

  // Hiển thị thông báo nếu không phải super_admin
  if (userChecked && !isSuperAdmin) {
    return (
      <div className="flex min-h-screen bg-gray-900">
        <AdminSidebar />
        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="bg-red-900 text-red-200 p-6 rounded-lg mb-4 max-w-lg">
              <h2 className="text-xl font-bold mb-2">Quyền truy cập bị từ chối</h2>
              <p className="mb-4">Bạn không có quyền truy cập vào trang phân tích nâng cao. Chỉ người dùng Super Admin mới có thể truy cập trang này.</p>
              <Link href="/admin/analytics" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded inline-block">
                Quay lại trang phân tích
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Hiển thị thông báo đang kiểm tra quyền truy cập
  if (!userChecked) {
    return (
      <div className="flex min-h-screen bg-gray-900">
        <AdminSidebar />
        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-400">Đang kiểm tra quyền truy cập...</p>
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
              <h1 className="text-3xl font-bold mb-2">Phân tích nâng cao</h1>
              <p className="text-gray-400">
                Phân tích chi tiết và chuyên sâu về hoạt động người dùng và nội dung
              </p>
            </div>
            <Link href="/admin/analytics" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
              Quay lại tổng quan
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
          </div>
        </div>

        {/* KPIs Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">KPIs chính</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard title="Người dùng hoạt động" value={analyticsData.kpis.kpis.dau.toLocaleString()} />
            <KpiCard title="MAU" value={analyticsData.kpis.kpis.mau.toLocaleString()} />
            <KpiCard title="DAU/MAU Ratio" value={`${(analyticsData.kpis.kpis.dau_mau_ratio * 100).toFixed(1)}%`} subtitle={analyticsData.kpis.kpis.dau_mau_ratio >= 0.2 ? "Tốt" : "Cần cải thiện"} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <KpiCard title="Thời gian đọc trung bình" value={`${analyticsData.kpis.kpis.session.avg_length} phút`} />
            <KpiCard title="Chapter/phiên" value={analyticsData.kpis.kpis.session.avg_chapters} />
            <KpiCard title="Tỷ lệ giữ chân" value={`${(analyticsData.kpis.retentionChart.datasets[0].data[0] * 100).toFixed(1)}%`} />
          </div>
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Line Chart - Genre trends over time */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Xu hướng thể loại theo thời gian</h3>
            <div style={{ height: "300px" }}>
              <LineChartMemo data={analyticsData.genre_trends} options={lineChartOptions} />
            </div>
          </div>

          {/* Bar Chart - Drop-off rate */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Tỷ lệ rời truyện (Drop-off)</h3>
            <div style={{ height: "300px" }}>
              <BarChartMemo data={analyticsData.dropoff_rate} options={barChartOptions} />
            </div>
          </div>

          {/* Pie Chart - User segments */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Phân khúc người dùng</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div style={{ height: "250px" }}>
                <PieChartMemo data={analyticsData.user_segments.chartData} options={pieChartOptions} />
              </div>
              <div className="overflow-y-auto max-h-64">
                {analyticsData.user_segments.segments.map((segment, index) => (
                  <div key={index} className="mb-3 bg-gray-700 p-3 rounded-lg">
                    <h4 className="font-semibold">{segment.name} ({segment.percentage}%)</h4>
                    <p className="text-sm text-gray-400">{segment.criteria}</p>
                    <ul className="mt-2 text-sm">
                      {segment.characteristics.map((char, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-blue-400 mr-1">•</span> {char}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pie Chart - Traffic sources */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Nguồn truy cập</h3>
            <div style={{ height: "250px" }}>
              <PieChartMemo
                data={analyticsData.traffic_sources}
                options={{
                  ...pieChartOptions,
                  plugins: {
                    ...pieChartOptions.plugins,
                    title: {
                      ...pieChartOptions.plugins.title,
                      text: "Nguồn truy cập"
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Geographic data */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Bản đồ truy cập</h2>
          <div className="bg-gray-800 p-6 rounded-lg">
            <div style={{ height: "400px" }}>
              {/* Placeholder for map component */}
              <div className="bg-gray-700 h-full w-full flex items-center justify-center rounded-lg">
                <div className="text-center">
                  <p className="text-gray-400 mb-2">Bản đồ nhiệt truy cập</p>
                  <p className="text-sm text-gray-500">
                    (Trong môi trường thực tế, đây sẽ là Google Maps hoặc Mapbox với dữ liệu heatmap)
                  </p>
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {analyticsData.geo_data.regions.map((region, index) => (
                      <div key={index} className="bg-gray-800 p-2 rounded text-sm">
                        <span className="font-medium">{region.name}:</span> {region.value}%
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Chatbox */}
        <div>
          <h2 className="text-2xl font-bold mb-4">AI Phân tích</h2>
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="mb-4">
              <label className="block text-gray-400 mb-2">Chọn loại phân tích:</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setPromptType("general");
                    setAiLoading(true);
                  }}
                  className={`px-3 py-1 rounded ${
                    promptType === "general"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  Tổng quan
                </button>
                <button
                  onClick={() => {
                    setPromptType("retention");
                    setAiLoading(true);
                  }}
                  className={`px-3 py-1 rounded ${
                    promptType === "retention"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  Giữ chân người dùng
                </button>
                <button
                  onClick={() => {
                    setPromptType("content");
                    setAiLoading(true);
                  }}
                  className={`px-3 py-1 rounded ${
                    promptType === "content"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  Nội dung
                </button>
                <button
                  onClick={() => {
                    setPromptType("user_behavior");
                    setAiLoading(true);
                  }}
                  className={`px-3 py-1 rounded ${
                    promptType === "user_behavior"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  Hành vi người dùng
                </button>
                <button
                  onClick={() => setPromptType("chat")}
                  className={`px-3 py-1 rounded ${
                    promptType === "chat"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  Chat với AI
                </button>
              </div>
            </div>

            <div
              ref={chatboxRef}
              className="bg-gray-700 rounded-lg p-4 h-64 mb-4 overflow-y-auto"
            >
              {/* Hiển thị prompt dựa vào loại phân tích được chọn (ngoại trừ chat) */}
              {promptType !== "chat" ? (
                <>
                  {aiPrompt && (
                    <div className="mb-4">
                      <p className="bg-gray-800 p-3 rounded-lg inline-block max-w-[80%]">
                        <span className="font-semibold text-blue-400">Prompt:</span> {aiPrompt}
                      </p>
                    </div>
                  )}

                  {/* Hiển thị câu hỏi của người dùng */}
                  {userPrompt && (
                    <div className="mb-4 text-right">
                      <p className="bg-blue-800 p-3 rounded-lg inline-block max-w-[80%]">
                        <span className="font-semibold text-white">Bạn:</span> {userPrompt}
                      </p>
                    </div>
                  )}

                  {/* Hiển thị phản hồi của AI */}
                  {aiResponse && aiResponse.length > 0 && (
                    <div className="mb-4">
                      <p className="bg-gray-600 p-3 rounded-lg inline-block max-w-[80%] ml-auto whitespace-pre-wrap">
                        <span className="font-semibold text-green-400">AI:</span> {aiResponse}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                /* Hiển thị lịch sử chat khi ở tab chat */
                <>
                  {chatHistory.map((message, index) => (
                    <div key={index} className={`mb-4 ${message.role === "user" ? "text-right" : ""}`}>
                      <p className={`p-3 rounded-lg inline-block max-w-[80%] whitespace-pre-wrap ${
                        message.role === "user"
                          ? "bg-blue-800 text-white"
                          : "bg-gray-600 text-white"
                      }`}>
                        <span className={`font-semibold ${message.role === "user" ? "text-white" : "text-green-400"}`}>
                          {message.role === "user" ? "Bạn: " : "AI: "}
                        </span>
                        {message.content}
                      </p>
                    </div>
                  ))}
                </>
              )}

              {aiLoading && (
                <div className="flex items-center justify-center w-full my-4">
                  <div className="bg-gray-600 p-3 rounded-lg flex items-center">
                    <div className="mr-2 text-sm text-gray-300">AI đang xử lý...</div>
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col space-y-2">
              <div className="flex">
                <input
                  type="text"
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder={promptType === "chat" ? "Nhập câu hỏi để chat với AI..." : "Nhập câu hỏi hoặc yêu cầu phân tích..."}
                  className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleAskAI()}
                />
                <button
                  onClick={handleAskAI}
                  disabled={aiLoading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-r flex items-center justify-center"
                >
                  {aiLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                  )}
                </button>
              </div>

              <div className="text-xs text-gray-400 italic">
                {promptType === "chat"
                  ? "Gợi ý: Bạn có thể hỏi bất kỳ câu hỏi nào về dữ liệu và phân tích của trang web"
                  : "Gợi ý: \"Phân tích xu hướng thể loại và đề xuất cách tăng lượt đọc\", \"Tại sao tỷ lệ rời truyện cao?\", \"Làm thế nào để tăng tỷ lệ giữ chân người dùng?\""
                }
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
