/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Tạo axios instance với cấu hình chung
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Thêm interceptor để xử lý authentication token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API cho manga
export const mangaApi = {
  // Lấy danh sách manga với phân trang và lọc
  getMangas: async (params?: {
    page?: number;
    limit?: number;
    genre?: string;
    status?: string;
    sort?: string;
    search?: string;
    _?: number; // Add timestamp for cache busting
  }) => {
    const response = await api.get('/v1/mangas', { params });
    return response.data;
  },

  // Lấy chi tiết một manga
  getManga: async (id: string | number, noCache: boolean = false) => {
    const params = noCache ? { _: Date.now() } : {};
    const response = await api.get(`/v1/mangas/${id}`, { params });
    return response.data;
  },

  // Lấy danh sách chapter của một manga
  getMangaChapters: async (mangaId: string | number) => {
    const response = await api.get(`/v1/mangas/${mangaId}/chapters`);
    return response.data;
  },

  // Lấy bảng xếp hạng theo thời gian
  getRankings: async (period: 'day' | 'week' | 'month', limit: number = 6) => {
    const response = await api.get(`/v1/mangas/rankings/${period}`, { params: { limit } });
    return response.data;
  },

  // Kiểm tra trạng thái yêu thích của một manga
  checkFavorite: async (mangaId: string | number) => {
    // Ensure mangaId is a number
    const numericId = typeof mangaId === 'string' ? parseInt(mangaId) : mangaId;
    const response = await api.get(`/v1/users/favorites/check/${numericId}`);
    return response.data;
  },

  // Lấy đánh giá của người dùng hiện tại cho một manga
  getUserRating: async (mangaId: string | number) => {
    // Ensure mangaId is a number
    const numericId = typeof mangaId === 'string' ? parseInt(mangaId) : mangaId;
    try {
      const response = await api.get(`/v1/mangas/${numericId}/ratings/user`);
      return response.data;
    } catch (error: any) {
      // If the user hasn't rated this manga yet, return null
      if (error.response && error.response.status === 404) {
        return null;
      }
      throw error;
    }
  },

  // Tạo manga mới (cần quyền admin)
  createManga: async (mangaData: FormData) => {
    const response = await api.post('/v1/mangas', mangaData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Cập nhật manga (cần quyền admin)
  updateManga: async (id: string | number, mangaData: FormData) => {
    const response = await api.put(`/v1/mangas/${id}`, mangaData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Xóa manga (cần quyền admin)
  deleteManga: async (id: string | number) => {
    const response = await api.delete(`/v1/mangas/${id}`);
    return response.data;
  },

  rateManga: async (mangaId: string | number, rating: number) => {
    // Ensure mangaId is a number
    const numericId = typeof mangaId === 'string' ? parseInt(mangaId) : mangaId;
    const response = await api.post(`/v1/mangas/${numericId}/ratings`, {
      rating: {
        rating: rating
      }
    });
    return response.data;
  },
};

// API cho chapter
export const chapterApi = {
  // Lấy chi tiết một chapter
  getChapter: async (mangaId: string | number, chapterId: string | number) => {
    const response = await api.get(`/v1/mangas/${mangaId}/chapters/${chapterId}`);
    return response.data;
  },

  // Lấy danh sách chapter của một manga
  getMangaChapters: async (mangaId: string | number, noCache: boolean = false) => {
    const params = noCache ? { _: Date.now() } : {};
    const response = await api.get(`/v1/mangas/${mangaId}/chapters`, { params });
    console.log("resp getMangaChapters", response.data)
    return response.data;
  },

  // Lấy comments của một chapter
  getChapterComments: async (mangaId: string | number, chapterId: string | number) => {
    const response = await api.get(`/v1/mangas/${mangaId}/chapters/${chapterId}/comments`);
    return response.data;
  },

  // Thêm comment vào chapter
  addChapterComment: async (
    mangaId: string | number,
    chapterId: string | number,
    content: string,
    stickers?: string[],
    parentId?: number
  ) => {
    const body: any = { content };
    if (stickers && stickers.length > 0) body.stickers = stickers;
    if (parentId) body.parent_id = parentId;
    const response = await api.post(`/v1/mangas/${mangaId}/chapters/${chapterId}/comments`, body);
    return response.data;
  },

  // Tạo chapter mới (cần quyền admin)
  createChapter: async (mangaId: string | number, chapterData: FormData) => {
    // Thêm manga_id vào formData
    chapterData.append("manga_id", mangaId.toString());
    const response = await api.post(`/v1/mangas/${mangaId}/chapters`, chapterData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Cập nhật chapter (cần quyền admin)
  updateChapter: async (mangaId: string | number, chapterId: string | number, chapterData: FormData) => {
    const response = await api.put(`/v1/mangas/${mangaId}/chapters/${chapterId}`, chapterData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Xóa chapter (cần quyền admin)
  deleteChapter: async (mangaId: string | number, chapterId: string | number) => {
    const response = await api.delete(`/v1/mangas/${mangaId}/chapters/${chapterId}`);
    return response.data;
  },
};

// API cho chapter images
export const chapterImageApi = {
  // Lấy danh sách ảnh của một chapter
  getChapterImages: async (mangaId: string | number, chapterId: string | number) => {
    const response = await api.get(`/v1/mangas/${mangaId}/chapters/${chapterId}`);
    return response.data.images || [];
  },

  // Cập nhật vị trí ảnh trong chapter
  updateImagePositions: async (mangaId: string | number, chapterId: string | number, positionMapping: Record<number, number>) => {
    const formData = new FormData();

    // Thêm mapping vị trí vào formData
    Object.entries(positionMapping).forEach(([oldPos, newPos]) => {
      formData.append(`image_positions[${oldPos}]`, newPos.toString());
    });

    const response = await api.put(`/v1/mangas/${mangaId}/chapters/${chapterId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Xóa ảnh trong chapter theo vị trí
  deleteImage: async (mangaId: string | number, chapterId: string | number, position: number) => {
    const formData = new FormData();
    formData.append('image_positions_to_delete[]', position.toString());

    const response = await api.put(`/v1/mangas/${mangaId}/chapters/${chapterId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Thêm một ảnh vào chapter
  addChapterImage: async (mangaId: string | number, chapterId: string | number, imageData: FormData) => {
    // Đảm bảo formData có trường new_images[]
    const newFormData = new FormData();

    // Lấy file từ formData cũ
    const image = imageData.get('chapter_image[image]') || imageData.get('image');
    const position = imageData.get('chapter_image[position]') || imageData.get('position');
    const isExternal = imageData.get('chapter_image[is_external]') || imageData.get('is_external');
    const externalUrl = imageData.get('chapter_image[external_url]') || imageData.get('external_url');

    if (image) newFormData.append('new_images[]', image);
    if (position) newFormData.append('new_image_positions[]', position.toString());
    if (isExternal) newFormData.append('is_external', isExternal.toString());
    if (externalUrl) newFormData.append('external_url', externalUrl.toString());

    const response = await api.put(`/v1/mangas/${mangaId}/chapters/${chapterId}`, newFormData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Thêm nhiều ảnh vào chapter
  bulkAddChapterImages: async (mangaId: string | number, chapterId: string | number, imagesData: FormData) => {
    // Đảm bảo formData có trường new_images[]
    const newFormData = new FormData();

    // Lấy các files từ formData cũ
    const images = imagesData.getAll('images[]');

    // Thêm từng file vào new_images[]
    images.forEach(image => {
      newFormData.append('new_images[]', image);
    });

    const response = await api.put(`/v1/mangas/${mangaId}/chapters/${chapterId}`, newFormData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// API cho user
export const userApi = {
  // Đăng ký tài khoản
  register: async (userData: { username: string; email: string; password: string }) => {
    const response = await api.post('/v1/auth/register', userData);
    return response.data;
  },

  // Đăng nhập
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/v1/auth/login', credentials);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  // Đăng xuất
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Lấy thông tin user hiện tại
  getCurrentUser: async () => {
    console.log("⏳ Gọi API getCurrentUser()");
    const response = await api.get('/v1/users/me');
    return response.data;
  },

  // Cập nhật thông tin user
  updateUser: async (userData: { username?: string; email?: string; password?: string; avatar?: File }) => {
    const formData = new FormData();
    Object.entries(userData).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(`user[${key}]`, value);
      }
    });

    const response = await api.put('/v1/users/me', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Thêm/xóa manga vào danh sách yêu thích
  toggleFavorite: async (mangaId: string | number) => {
    const response = await api.post(`/v1/users/favorites/${mangaId}`);
    return response.data;
  },

  // Lấy danh sách manga yêu thích
  getFavorites: async () => {
    const response = await api.get('/v1/users/favorites');
    return response.data;
  },

  // Lấy lịch sử đọc truyện
  getReadingHistory: async () => {
    const response = await api.get('/v1/reading_histories');
    return response.data;
  },

  // Thêm vào lịch sử đọc truyện
  addToReadingHistory: async (mangaId: string | number, chapterId: string | number) => {
    const response = await api.post('/v1/reading_histories', {
      reading_history: {
        manga_id: mangaId,
        chapter_id: chapterId
      }
    });
    return response.data;
  },

  // Xóa một lịch sử đọc truyện
  deleteReadingHistory: async (historyId: string | number) => {
    const response = await api.delete(`/v1/reading_histories/${historyId}`);
    return response.data;
  },

  // Xóa tất cả lịch sử đọc truyện
  deleteAllReadingHistory: async () => {
    const response = await api.delete('/v1/reading_histories/destroy_all');
    return response.data;
  },
};

// API cho proxy
export const proxyApi = {
  // Fetch external content through our backend proxy
  fetchUrl: async (url: string) => {
    const response = await api.get(`/v1/proxy/fetch`, {
      params: { url },
      responseType: 'text'
    });
    return response.data;
  },

  // Batch import chapters from URLs
  batchImportChapters: async (mangaId: string | number, urls: string[], options?: {
    autoNumber?: boolean,
    startNumber?: number
  }) => {
    const response = await api.post(`/v1/proxy/batch_import_chapters`, {
      manga_id: mangaId,
      urls: urls,
      auto_number: options?.autoNumber,
      start_number: options?.startNumber
    });
    return response.data;
  },

  // Crawl manga from URL
  crawlManga: async (url: string, options?: {
    max_chapters?: number | string,
    chapter_range?: string,
    delay?: string,
    schedule?: boolean,
    schedule_type?: 'daily' | 'weekly' | 'monthly',
    schedule_time?: string,
    schedule_days?: string
  }) => {
    const response = await api.post(`/v1/proxy/crawl_manga`, {
      url,
      ...options
    });
    return response.data;
  },

  // Crawl novel from URL
  crawlNovel: async (url: string, options?: {
    max_chapters?: number | string,
    chapter_range?: string,
    delay?: string,
    schedule?: boolean,
    schedule_type?: 'daily' | 'weekly' | 'monthly',
    schedule_time?: string,
    schedule_days?: string
  }) => {
    const response = await api.post(`/v1/proxy/crawl_novel`, {
      url,
      ...options
    });
    return response.data;
  },

  // Test extract images from URL
  testExtractImages: async (url: string) => {
    const response = await api.post(`/v1/proxy/test_extract_images`, { url });
    return response.data;
  }
};

// API cho scheduled crawls
export const scheduledCrawlApi = {
  // Lấy danh sách scheduled crawls
  getScheduledCrawls: async (params?: {
    manga_id?: number,
    status?: string,
    page?: number,
    per_page?: number
  }) => {
    const response = await api.get('/v1/scheduled_crawls', { params });
    return response.data;
  },

  // Lấy chi tiết một scheduled crawl
  getScheduledCrawl: async (id: string | number) => {
    const response = await api.get(`/v1/scheduled_crawls/${id}`);
    return response.data;
  },

  // Tạo scheduled crawl mới
  createScheduledCrawl: async (data: {
    manga_id: number,
    url?: string,
    schedule_type: 'daily' | 'weekly' | 'monthly',
    schedule_time: string,
    schedule_days?: string,
    max_chapters?: number | string,
    chapter_range?: string,
    delay?: string,
    status?: 'active' | 'paused' | 'completed'
  }) => {
    const response = await api.post('/v1/scheduled_crawls', data);
    return response.data;
  },

  // Cập nhật scheduled crawl
  updateScheduledCrawl: async (id: string | number, data: {
    url?: string,
    schedule_type?: 'daily' | 'weekly' | 'monthly',
    schedule_time?: string,
    schedule_days?: string,
    max_chapters?: number | string,
    chapter_range?: string,
    delay?: string,
    status?: 'active' | 'paused' | 'completed'
  }) => {
    const response = await api.put(`/v1/scheduled_crawls/${id}`, data);
    return response.data;
  },

  // Xóa scheduled crawl
  deleteScheduledCrawl: async (id: string | number) => {
    const response = await api.delete(`/v1/scheduled_crawls/${id}`);
    return response.data;
  },

  // Chạy scheduled crawl ngay lập tức
  runScheduledCrawlNow: async (id: string | number) => {
    const response = await api.post(`/v1/scheduled_crawls/${id}/run_now`);
    return response.data;
  }
};

// API cho scheduled jobs
export const scheduledJobApi = {
  // Lấy danh sách scheduled jobs
  getScheduledJobs: async (params?: {
    job_type?: string,
    status?: string,
    page?: number,
    per_page?: number
  }) => {
    const response = await api.get('/v1/scheduled_jobs', { params });
    return response.data;
  },

  // Lấy chi tiết một scheduled job
  getScheduledJob: async (id: string | number) => {
    const response = await api.get(`/v1/scheduled_jobs/${id}`);
    return response.data;
  },

  // Retry một job đã thất bại
  retryJob: async (id: string | number) => {
    const response = await api.post(`/v1/scheduled_jobs/${id}/retry`);
    return response.data;
  },

  // Hủy một job đang chờ
  cancelJob: async (id: string | number) => {
    const response = await api.post(`/v1/scheduled_jobs/${id}/cancel`);
    return response.data;
  },

  // Tạm dừng một job đang chạy
  pauseJob: async (id: string | number) => {
    const response = await api.post(`/v1/scheduled_jobs/${id}/pause`);
    return response.data;
  },

  // Lấy thống kê về jobs
  getJobStats: async () => {
    const response = await api.get('/v1/scheduled_jobs/stats');
    return response.data;
  }
};

// API cho comment
export const commentApi = {
  // Lấy comments của một manga
  getMangaComments: async (mangaId: string | number) => {
    const response = await api.get(`/v1/mangas/${mangaId}/comments`);
    return response.data;
  },

  // Lấy comments của một chapter
  getChapterComments: async (mangaId: string | number, chapterId: string | number) => {
    const response = await api.get(`/v1/mangas/${mangaId}/chapters/${chapterId}/comments`);
    return response.data;
  },

  // Thêm comment vào manga
  addMangaComment: async (mangaId: string | number, content: string, sticker?: string) => {
    const response = await api.post(`/v1/mangas/${mangaId}/comments`, { content, sticker });
    return response.data;
  },

  // Thêm comment vào chapter
  addChapterComment: async (
    mangaId: string | number,
    chapterId: string | number,
    content: string,
    stickers?: string[],
    parentId?: number
  ) => {
    const body: any = { content };
    if (stickers && stickers.length > 0) body.stickers = stickers;
    if (parentId) body.parent_id = parentId;
    const response = await api.post(`/v1/mangas/${mangaId}/chapters/${chapterId}/comments`, body);
    return response.data;
  },

  // Trả lời comment
  replyToComment: async (
    chapterId: string | number,
    parentId: number,
    content: string,
    stickers?: string[],
    mangaId?: string | number
  ) => {
    const body: any = { content, parent_id: parentId };
    if (stickers && stickers.length > 0) body.stickers = stickers;

    // Use manga_id if provided, otherwise fall back to old URL
    const url = mangaId
      ? `/v1/mangas/${mangaId}/chapters/${chapterId}/comments`
      : `/v1/chapters/${chapterId}/comments`;

    const response = await api.post(url, body);
    return response.data;
  },

  // Xóa comment (chỉ xóa được comment của mình hoặc cần quyền admin)
  deleteComment: async (commentId: string | number) => {
    const response = await api.delete(`/v1/comments/${commentId}`);
    return response.data;
  },
};

// API cho genre
export const genreApi = {
  // Lấy tất cả thể loại
  getGenres: async () => {
    const response = await api.get('/v1/genres');
    return response.data;
  },

  // Tạo thể loại mới (cần quyền admin)
  createGenre: async (name: string) => {
    const response = await api.post('/v1/genres', { name });
    return response.data;
  },

  // Cập nhật thể loại (cần quyền admin)
  updateGenre: async (id: string | number, name: string) => {
    const response = await api.put(`/v1/genres/${id}`, { name });
    return response.data;
  },

  // Xóa thể loại (cần quyền admin)
  deleteGenre: async (id: string | number) => {
    const response = await api.delete(`/v1/genres/${id}`);
    return response.data;
  },
};

// API cho admin
export const adminApi = {
  // Lấy thống kê dashboard
  getDashboardStats: async () => {
    const response = await api.get('/v1/admin/dashboard/stats');
    return response.data;
  },

  // Backup database (chỉ dành cho super_admin hoặc owner)
  backupDatabase: async () => {
    try {
      console.log("Starting database backup download...");

      // Tạo timestamp để tránh cache
      const timestamp = new Date().getTime();
      const downloadUrl = `${API_URL}/v1/admin/dashboard/backup_database?_=${timestamp}`;

      // Tạo iframe ẩn để tải xuống
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = downloadUrl;
      document.body.appendChild(iframe);

      // Xóa iframe sau một khoảng thời gian
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 60000); // 60 giây

      return {
        success: true,
        message: "Đang tải xuống bản sao lưu... Vui lòng đợi trong giây lát."
      };
    } catch (error) {
      console.error("Error in backupDatabase:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định khi tải xuống bản sao lưu"
      };
    }
  },

  // Lấy dữ liệu phân tích
  getAnalytics: async (timeRange = 'week') => {
    try {
      const response = await api.get('/v1/admin/analytics', {
        params: { time_range: timeRange }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      throw error; // Re-throw to let the component handle the error
    }
  },

  // Lấy dữ liệu phân tích nâng cao
  getAdvancedAnalytics: async (timeRange = 'week') => {
    try {
      const response = await api.get('/v1/admin/analytics/advanced', {
        params: { time_range: timeRange }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching advanced analytics data:', error);
      throw error; // Re-throw to let the component handle the error
    }
  },

  // Lấy prompt cho AI phân tích
  getAIPrompt: async (dataType = 'general', userPrompt = '') => {
    try {
      const response = await api.post('/v1/admin/analytics/ai_prompt', {
        data_type: dataType,
        user_prompt: userPrompt
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching AI prompt:', error);
      throw error; // Re-throw to let the component handle the error
    }
  },

  // Lấy danh sách người dùng (cần quyền admin)
  getUsers: async (params?: { page?: number; limit?: number; search?: string }) => {
    const response = await api.get('/v1/admin/users', { params });
    return response.data;
  },

  // Cập nhật vai trò người dùng (cần quyền admin)
  updateUserRole: async (userId: number, role: string) => {
    const response = await api.put(`/v1/admin/users/${userId}/role`, { role });
    return response.data;
  },

  // Xóa người dùng (cần quyền admin hoặc super_admin)
  deleteUser: async (userId: number) => {
    const response = await api.delete(`/v1/admin/users/${userId}`);
    return response.data;
  }
};

// API cho error reports
export const errorReportApi = {
  // Tạo báo lỗi mới cho chapter
  createErrorReport: async (
    mangaId: string | number,
    chapterId: string | number,
    data: { error_type: string; description: string }
  ) => {
    const response = await api.post(
      `/v1/mangas/${mangaId}/chapters/${chapterId}/error_reports`,
      { error_report: data }
    );
    return response.data;
  },

  // Lấy danh sách báo lỗi của một chapter (cần quyền admin)
  getChapterErrorReports: async (mangaId: string | number, chapterId: string | number) => {
    const response = await api.get(`/v1/mangas/${mangaId}/chapters/${chapterId}/error_reports`);
    return response.data;
  },

  // Lấy tất cả báo lỗi (cần quyền admin)
  getAllErrorReports: async (params?: { unresolved?: boolean }) => {
    const response = await api.get('/v1/admin/error_reports', { params });
    return response.data;
  },

  // Lấy chi tiết một báo lỗi (cần quyền admin)
  getErrorReport: async (id: string | number) => {
    const response = await api.get(`/v1/error_reports/${id}`);
    return response.data;
  },

  // Đánh dấu báo lỗi đã được giải quyết (cần quyền admin)
  resolveErrorReport: async (id: string | number) => {
    const response = await api.patch(`/v1/error_reports/${id}/resolve`);
    return response.data;
  },

  // Cập nhật báo lỗi (cần quyền admin)
  updateErrorReport: async (
    id: string | number,
    data: { error_type?: string; description?: string }
  ) => {
    const response = await api.put(`/v1/error_reports/${id}`, { error_report: data });
    return response.data;
  },

  // Xóa báo lỗi (cần quyền admin)
  deleteErrorReport: async (id: string | number) => {
    const response = await api.delete(`/v1/error_reports/${id}`);
    return response.data;
  },
};

// API cho notifications
export const notificationApi = {
  // Lấy danh sách thông báo
  getNotifications: async (params?: {
    page?: number;
    per_page?: number;
    read?: boolean;
    type?: string;
  }) => {
    const response = await api.get('/v1/notifications', { params });
    return response.data;
  },

  // Lấy chi tiết một thông báo
  getNotification: async (id: string | number) => {
    const response = await api.get(`/v1/notifications/${id}`);
    return response.data;
  },

  // Đánh dấu thông báo đã đọc
  markAsRead: async (id: string | number) => {
    const response = await api.post(`/v1/notifications/${id}/mark_as_read`);
    return response.data;
  },

  // Đánh dấu thông báo chưa đọc
  markAsUnread: async (id: string | number) => {
    const response = await api.post(`/v1/notifications/${id}/mark_as_unread`);
    return response.data;
  },

  // Đánh dấu tất cả thông báo đã đọc
  markAllAsRead: async () => {
    const response = await api.post('/v1/notifications/mark_all_as_read');
    return response.data;
  },

  // Xóa một thông báo
  deleteNotification: async (id: string | number) => {
    const response = await api.delete(`/v1/notifications/${id}`);
    return response.data;
  },

  // Xóa tất cả thông báo
  clearAllNotifications: async () => {
    const response = await api.delete('/v1/notifications/clear_all');
    return response.data;
  },

  // Lấy số lượng thông báo chưa đọc
  getUnreadCount: async () => {
    const response = await api.get('/v1/notifications/unread_count');
    return response.data.count;
  }
};

export default api;

