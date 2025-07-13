/* eslint-disable @typescript-eslint/no-explicit-any */
import useSWR, { SWRConfiguration, SWRResponse } from 'swr';

// API base URL từ environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Hàm fetcher cho SWR
export const fetcher = async (url: string) => {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const response = await fetch(fullUrl, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });

  if (!response.ok) {
    throw new Error('An error occurred while fetching the data.');
  }

  return response.json();
};

// Cấu hình SWR mặc định
export const defaultSWRConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  dedupingInterval: 60000, // Cache trong 1 phút
  revalidateIfStale: false
};

// Hooks SWR cho manga
export const useMangas = (params?: {
  page?: number;
  limit?: number;
  genre?: string;
  status?: string;
  sort?: string;
  search?: string;
}, config?: SWRConfiguration): SWRResponse<any, any> => {
  const queryParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });
  }

  const queryString = queryParams.toString();
  const url = `/v1/mangas${queryString ? `?${queryString}` : ''}`;

  return useSWR(url, fetcher, { ...defaultSWRConfig, ...config });
};

export const useManga = (id: string | number, config?: SWRConfiguration): SWRResponse<any, any> => {
  return useSWR(id ? `/v1/mangas/${id}` : null, fetcher, { ...defaultSWRConfig, ...config });
};

export const useMangaChapters = (mangaId: string | number, config?: SWRConfiguration): SWRResponse<any, any> => {
  return useSWR(mangaId ? `/v1/mangas/${mangaId}/chapters` : null, fetcher, { ...defaultSWRConfig, ...config });
};

export const useRankings = (period: 'day' | 'week' | 'month', limit: number = 6, config?: SWRConfiguration): SWRResponse<any, any> => {
  return useSWR(`/v1/mangas/rankings/${period}?limit=${limit}`, fetcher, { ...defaultSWRConfig, ...config });
};

export const useFavoriteStatus = (mangaId: string | number, isAuthenticated: boolean, config?: SWRConfiguration): SWRResponse<any, any> => {
  const shouldFetch = isAuthenticated && mangaId;
  return useSWR(shouldFetch ? `/v1/users/favorites/check/${mangaId}` : null, fetcher, { ...defaultSWRConfig, ...config });
};

export const useUserRating = (mangaId: string | number, isAuthenticated: boolean, config?: SWRConfiguration): SWRResponse<any, any> => {
  const shouldFetch = isAuthenticated && mangaId;
  return useSWR(shouldFetch ? `/v1/mangas/${mangaId}/ratings/user` : null, fetcher, { ...defaultSWRConfig, ...config });
};

// Hooks SWR cho user
export const useCurrentUser = (isAuthenticated: boolean, config?: SWRConfiguration): SWRResponse<any, any> => {
  return useSWR(isAuthenticated ? '/v1/users/me' : null, fetcher, { ...defaultSWRConfig, ...config });
};

export const useFavorites = (isAuthenticated: boolean, config?: SWRConfiguration): SWRResponse<any, any> => {
  return useSWR(isAuthenticated ? '/v1/users/favorites' : null, fetcher, { ...defaultSWRConfig, ...config });
};

export const useReadingHistory = (isAuthenticated: boolean, config?: SWRConfiguration): SWRResponse<any, any> => {
  return useSWR(isAuthenticated ? '/v1/reading_histories' : null, fetcher, { ...defaultSWRConfig, ...config });
};

// Hooks SWR cho genre
export const useGenres = (config?: SWRConfiguration): SWRResponse<any, any> => {
  return useSWR('/v1/genres', fetcher, { ...defaultSWRConfig, ...config });
};

// Hooks SWR cho chapter
export const useChapter = (mangaId: string | number, chapterId: string | number, config?: SWRConfiguration): SWRResponse<any, any> => {
  const shouldFetch = mangaId && chapterId;
  return useSWR(shouldFetch ? `/v1/mangas/${mangaId}/chapters/${chapterId}` : null, fetcher, { ...defaultSWRConfig, ...config });
};

export const useChapterComments = (mangaId: string | number, chapterId: string | number, config?: SWRConfiguration): SWRResponse<any, any> => {
  const shouldFetch = mangaId && chapterId;
  return useSWR(shouldFetch ? `/v1/mangas/${mangaId}/chapters/${chapterId}/comments` : null, fetcher, { ...defaultSWRConfig, ...config });
};

// API functions (không sử dụng hooks)
export const mangaAPI = {
  // Đánh giá manga
  rateManga: async (mangaId: string | number, rating: number): Promise<any> => {
    // Đảm bảo mangaId là một số
    const numericId = typeof mangaId === 'string' && !isNaN(Number(mangaId))
      ? parseInt(mangaId)
      : typeof mangaId === 'number'
        ? mangaId
        : null;

    if (!numericId) {
      throw new Error('Invalid manga ID');
    }

    const fullUrl = `${API_BASE_URL}/v1/mangas/${numericId}/ratings`;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        rating: {
          rating: rating
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to rate manga');
    }

    return response.json();
  }
};

export const userAPI = {
  // Thêm/xóa manga vào danh sách yêu thích
  toggleFavorite: async (mangaId: string | number): Promise<any> => {
    // Đảm bảo mangaId là một số
    const numericId = typeof mangaId === 'string' && !isNaN(Number(mangaId))
      ? parseInt(mangaId)
      : typeof mangaId === 'number'
        ? mangaId
        : null;

    if (!numericId) {
      throw new Error('Invalid manga ID');
    }

    const fullUrl = `${API_BASE_URL}/v1/users/favorites/${numericId}`;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to toggle favorite');
    }

    return response.json();
  }
};

// Hàm mutate để làm mới dữ liệu
export const refreshData = async (key: string) => {
  const fullUrl = key.startsWith('http') ? key : `${API_BASE_URL}${key}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const response = await fetch(fullUrl, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error('An error occurred while refreshing the data.');
  }

  return response.json();
};
