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
  getMangas: async (params?: { page?: number; limit?: number; genre?: string; status?: string; sort?: string; search?: string }) => {
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

  rateManga: async (mangaId: string | number, rating: number) => {
    const response = await api.post(`/v1/mangas/${mangaId}/ratings`, {
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
  getMangaChapters: async (mangaId: string | number) => {
    const response = await api.get(`/v1/mangas/${mangaId}/chapters`);
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
  updateChapter: async (_mangaId: string | number, chapterId: string | number, chapterData: FormData) => {
    const response = await api.put(`/v1/chapters/${chapterId}`, chapterData, {
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
    const response = await api.post('/v1/reading_histories', { manga_id: mangaId, chapter_id: chapterId });
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