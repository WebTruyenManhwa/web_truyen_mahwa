/* eslint-disable @typescript-eslint/no-explicit-any */
import useSWR, { SWRConfiguration, SWRResponse } from 'swr';

// API base URL từ environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// 12-hour cache in milliseconds (12 * 60 * 60 * 1000)
const CACHE_DURATION = 43200000;

// Hàm fetcher cho SWR
export const fetcher = async (url: string) => {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  console.log('Fetching URL:', fullUrl);

  try {
    const response = await fetch(fullUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });

    if (!response.ok) {
      throw new Error('An error occurred while fetching the data.');
    }

    const data = await response.json();
    console.log('API Response:', data);
    console.log('API Response type:', typeof data.novel_series, Array.isArray(data.novel_series) ? 'is array' : 'not array');

    // Process novel data to ensure consistent format
    if (url.match(/\/v1\/novel_series\/\w+$/) && data) {
      // Single novel endpoint
      if (data.novel_series && !data.novel_series.cover_image) {
        data.novel_series.cover_image = '/placeholder-novel.jpg';
      }
    } else if (url.startsWith('/v1/novel_series') && data.novel_series) {
      // Novel list endpoint
      if (Array.isArray(data.novel_series)) {
        data.novel_series = data.novel_series.map((novel: any) => {
          if (!novel.cover_image) {
            novel.cover_image = '/placeholder-novel.jpg';
          }
          return novel;
        });
      } else {
        // Handle case where novel_series is not an array (single object)
        console.log('novel_series is not an array:', data.novel_series);
        if (data.novel_series && !data.novel_series.cover_image) {
          data.novel_series.cover_image = '/placeholder-novel.jpg';
        }
      }
    }

    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};

// Cấu hình SWR mặc định với cache 12 giờ
export const defaultNovelSWRConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  dedupingInterval: CACHE_DURATION,
  revalidateIfStale: false
};

// Hooks SWR cho novel series
export const useNovelSeries = (params?: {
  page?: number;
  per_page?: number;
  status?: string;
  sort_by?: string;
  sort_direction?: string;
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
  const url = `/v1/novel_series${queryString ? `?${queryString}` : ''}`;

  return useSWR(url, fetcher, { ...defaultNovelSWRConfig, ...config });
};

// Hook cho chi tiết novel series
export const useNovelSeriesDetail = (slug: string, config?: SWRConfiguration): SWRResponse<any, any> => {
  return useSWR(slug ? `/v1/novel_series/${slug}` : null, fetcher, { ...defaultNovelSWRConfig, ...config });
};

// Hook cho danh sách chapter của novel
export const useNovelChapters = (novelSlug: string, config?: SWRConfiguration): SWRResponse<any, any> => {
  return useSWR(novelSlug ? `/v1/novel_series/${novelSlug}/chapters` : null, fetcher, { ...defaultNovelSWRConfig, ...config });
};

// Hook cho chi tiết chapter của novel
export const useNovelChapter = (novelSlug: string, chapterSlug: string | number, config?: SWRConfiguration): SWRResponse<any, any> => {
  const shouldFetch = novelSlug && chapterSlug;
  return useSWR(shouldFetch ? `/v1/novel_series/${novelSlug}/chapters/${chapterSlug}` : null, fetcher, { ...defaultNovelSWRConfig, ...config });
};

// Hook cho bình luận của chapter
export const useNovelChapterComments = (novelSlug: string, chapterSlug: string | number, config?: SWRConfiguration): SWRResponse<any, any> => {
  const shouldFetch = novelSlug && chapterSlug;
  return useSWR(shouldFetch ? `/v1/novel_series/${novelSlug}/chapters/${chapterSlug}/comments` : null, fetcher, { ...defaultNovelSWRConfig, ...config });
};

// API functions (không sử dụng hooks)
export const novelAPI = {
  // Thêm bình luận vào chapter
  addChapterComment: async (novelSlug: string, chapterSlug: string | number, content: string, stickers?: string[]): Promise<any> => {
    const fullUrl = `${API_BASE_URL}/v1/novel_series/${novelSlug}/chapters/${chapterSlug}/comments`;
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
        comment: {
          content,
          stickers
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to add comment');
    }

    return response.json();
  },

  // Trả lời bình luận
  replyToComment: async (
    chapterSlug: string | number,
    commentId: number,
    content: string,
    stickers?: string[],
    novelSlug?: string
  ): Promise<any> => {
    const fullUrl = `${API_BASE_URL}/v1/novel_series/${novelSlug}/chapters/${chapterSlug}/comments/${commentId}/replies`;
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
        comment: {
          content,
          stickers
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to reply to comment');
    }

    return response.json();
  }
};

// Hàm mutate để làm mới dữ liệu
export const refreshNovelData = async (key: string) => {
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
