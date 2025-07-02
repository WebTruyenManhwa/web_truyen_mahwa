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
  getMangas: async (params?: { page?: number; limit?: number; genre?: string; status?: string; sort?: string }) => {
    const response = await api.get('/v1/mangas', { params });
    return response.data;
  },

  // Lấy chi tiết một manga
  getManga: async (id: string | number) => {
    const response = await api.get(`/v1/mangas/${id}`);
    return response.data;
  },

  // Lấy danh sách chapter của một manga
  getMangaChapters: async (mangaId: string | number) => {
    const response = await api.get(`/v1/mangas/${mangaId}/chapters`);
    return response.data;
  },

  // Kiểm tra trạng thái yêu thích của một manga
  checkFavorite: async (mangaId: string | number) => {
    const response = await api.get(`/v1/users/favorites/check/${mangaId}`);
    return response.data;
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
};

// API cho chapter
export const chapterApi = {
  // Lấy chi tiết một chapter
  getChapter: async (mangaId: string | number, chapterId: string | number) => {
    const response = await api.get(`/v1/chapters/${chapterId}`);
    return response.data;
  },

  // Lấy danh sách chapter của một manga
  getMangaChapters: async (mangaId: string | number) => {
    const response = await api.get(`/v1/mangas/${mangaId}/chapters`);
    return response.data;
  },

  // Lấy comments của một chapter
  getChapterComments: async (mangaId: string | number, chapterId: string | number) => {
    const response = await api.get(`/v1/chapters/${chapterId}/comments`);
    return response.data;
  },

  // Thêm comment vào chapter
  addChapterComment: async (mangaId: string | number, chapterId: string | number, content: string) => {
    const response = await api.post(`/v1/chapters/${chapterId}/comments`, { content });
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
    const response = await api.put(`/v1/chapters/${chapterId}`, chapterData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Xóa chapter (cần quyền admin)
  deleteChapter: async (mangaId: string | number, chapterId: string | number) => {
    const response = await api.delete(`/v1/chapters/${chapterId}`);
    return response.data;
  },
};

// API cho chapter images
export const chapterImageApi = {
  // Lấy danh sách ảnh của một chapter
  getChapterImages: async (chapterId: string | number) => {
    const response = await api.get(`/v1/chapters/${chapterId}/chapter_images`);
    return response.data;
  },

  // Cập nhật một ảnh trong chapter
  updateChapterImage: async (imageId: number, imageData: FormData) => {
    const response = await api.put(`/v1/chapter_images/${imageId}`, imageData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Xóa một ảnh trong chapter
  deleteChapterImage: async (imageId: number) => {
    const response = await api.delete(`/v1/chapter_images/${imageId}`);
    return response.data;
  },

  // Thêm một ảnh vào chapter
  addChapterImage: async (chapterId: string | number, imageData: FormData) => {
    const response = await api.post(`/v1/chapters/${chapterId}/chapter_images`, imageData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Thêm nhiều ảnh vào chapter
  bulkAddChapterImages: async (chapterId: string | number, imagesData: FormData) => {
    const response = await api.post(`/v1/chapters/${chapterId}/chapter_images/bulk`, imagesData, {
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
    const response = await api.post('/v1/reading_histories', { manga_id: mangaId, chapter_id: chapterId });
    return response.data;
  },
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
  addMangaComment: async (mangaId: string | number, content: string) => {
    const response = await api.post(`/v1/mangas/${mangaId}/comments`, { content });
    return response.data;
  },

  // Thêm comment vào chapter
  addChapterComment: async (mangaId: string | number, chapterId: string | number, content: string) => {
    const response = await api.post(`/v1/mangas/${mangaId}/chapters/${chapterId}/comments`, { content });
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
    const response = await api.get('/admin/stats');
    return response.data;
  },

  // Lấy danh sách người dùng (cần quyền admin)
  getUsers: async (params?: { page?: number; limit?: number }) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  // Cập nhật vai trò người dùng (cần quyền admin)
  updateUserRole: async (userId: string | number, role: string) => {
    const response = await api.put(`/admin/users/${userId}/role`, { role });
    return response.data;
  },
};

export default api; 