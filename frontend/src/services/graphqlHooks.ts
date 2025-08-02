import { useQuery, useMutation, QueryHookOptions, MutationHookOptions } from '@apollo/client';
import {
  GET_MANGAS,
  GET_MANGA,
  GET_RANKINGS,
  GET_CHAPTER,
  GET_READING_HISTORIES,
  GET_CURRENT_USER,
  TOGGLE_FAVORITE,
  CREATE_READING_HISTORY,
  DELETE_READING_HISTORY,
  DELETE_ALL_READING_HISTORIES,
  CREATE_COMMENT,
  GET_NOTIFICATIONS,
  GET_UNREAD_NOTIFICATIONS_COUNT,
  MARK_NOTIFICATION_AS_READ,
  MARK_ALL_NOTIFICATIONS_AS_READ,
  DELETE_NOTIFICATION,
  CLEAR_ALL_NOTIFICATIONS
} from './graphql';

// Query hooks

export const useMangas = (variables?: {
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortDirection?: string;
  filterByGenre?: string[];
  filterByStatus?: string;
  search?: string;
}, options?: QueryHookOptions) => {
  return useQuery(GET_MANGAS, {
    variables,
    ...options
  });
};

export const useManga = (id: string | number, options?: QueryHookOptions) => {
  return useQuery(GET_MANGA, {
    variables: { id: id.toString() },
    skip: !id,
    ...options
  });
};

export const useRankings = (period: 'day' | 'week' | 'month', limit: number = 6, options?: QueryHookOptions) => {
  return useQuery(GET_RANKINGS, {
    variables: { period, limit },
    ...options
  });
};

export const useChapter = (id: string | number, options?: QueryHookOptions) => {
  return useQuery(GET_CHAPTER, {
    variables: { id: id.toString() },
    skip: !id,
    ...options
  });
};

export const useReadingHistories = (limit: number = 50, options?: QueryHookOptions) => {
  return useQuery(GET_READING_HISTORIES, {
    variables: { limit },
    ...options
  });
};

export const useCurrentUser = (skip: boolean = false, options?: QueryHookOptions) => {
  return useQuery(GET_CURRENT_USER, {
    skip,
    ...options
  });
};

// Mutation hooks

export const useToggleFavorite = (options?: MutationHookOptions) => {
  return useMutation(TOGGLE_FAVORITE, options);
};

export const useCreateReadingHistory = (options?: MutationHookOptions) => {
  return useMutation(CREATE_READING_HISTORY, options);
};

export const useDeleteReadingHistory = (options?: MutationHookOptions) => {
  return useMutation(DELETE_READING_HISTORY, options);
};

export const useDeleteAllReadingHistories = (options?: MutationHookOptions) => {
  return useMutation(DELETE_ALL_READING_HISTORIES, options);
};

export const useCreateComment = (options?: MutationHookOptions) => {
  return useMutation(CREATE_COMMENT, options);
};

// Notifications hooks
export const useNotifications = (page: number = 1, perPage: number = 20, read?: boolean, options?: QueryHookOptions) => {
  return useQuery(GET_NOTIFICATIONS, {
    variables: { page, perPage, read },
    ...options
  });
};

export const useUnreadNotificationsCount = (options?: QueryHookOptions) => {
  return useQuery(GET_UNREAD_NOTIFICATIONS_COUNT, {
    pollInterval: 60000, // Poll every minute
    ...options
  });
};

export const useMarkNotificationAsRead = (options?: MutationHookOptions) => {
  return useMutation(MARK_NOTIFICATION_AS_READ, options);
};

export const useMarkAllNotificationsAsRead = (options?: MutationHookOptions) => {
  return useMutation(MARK_ALL_NOTIFICATIONS_AS_READ, options);
};

export const useDeleteNotification = (options?: MutationHookOptions) => {
  return useMutation(DELETE_NOTIFICATION, options);
};

export const useClearAllNotifications = (options?: MutationHookOptions) => {
  return useMutation(CLEAR_ALL_NOTIFICATIONS, options);
};
