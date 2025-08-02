import { gql } from '@apollo/client';
import { MANGA_FRAGMENT, CHAPTER_FRAGMENT } from './graphqlClient';

// QUERIES

// Lấy danh sách manga với phân trang và lọc
export const GET_MANGAS = gql`
  query GetMangas(
    $page: Int,
    $perPage: Int,
    $sortBy: String,
    $sortDirection: String,
    $filterByGenre: [ID!],
    $filterByStatus: String,
    $search: String
  ) {
    mangas(
      page: $page,
      perPage: $perPage,
      sortBy: $sortBy,
      sortDirection: $sortDirection,
      filterByGenre: $filterByGenre,
      filterByStatus: $filterByStatus,
      search: $search
    ) {
      ...MangaFields
    }
  }
  ${MANGA_FRAGMENT}
`;

// Lấy chi tiết một manga
export const GET_MANGA = gql`
  query GetManga($id: ID!) {
    manga(id: $id) {
      ...MangaFields
      genres {
        id
        name
      }
      chapters {
        ...ChapterFields
      }
      latestChapter {
        ...ChapterFields
      }
      chaptersCount
    }
  }
  ${MANGA_FRAGMENT}
  ${CHAPTER_FRAGMENT}
`;

// Lấy bảng xếp hạng manga
export const GET_RANKINGS = gql`
  query GetRankings($period: String, $limit: Int) {
    rankings(period: $period, limit: $limit) {
      id
      title
      description
      coverImage
      status
      author
      artist
      releaseYear
      rating
      totalVotes
      viewCount
      createdAt
      updatedAt
      latestChapter {
        id
        number
        title
      }
    }
  }
`;

// Lấy chi tiết một chapter
export const GET_CHAPTER = gql`
  query GetChapter($id: ID!) {
    chapter(id: $id) {
      ...ChapterFields
      images
      manga {
        id
        title
        coverImage
      }
      nextChapter {
        id
        number
        title
      }
      prevChapter {
        id
        number
        title
      }
    }
  }
  ${CHAPTER_FRAGMENT}
`;

// Lấy lịch sử đọc truyện
export const GET_READING_HISTORIES = gql`
  query GetReadingHistories($limit: Int) {
    readingHistories(limit: $limit) {
      id
      lastReadAt
      manga {
        ...MangaFields
      }
      chapter {
        ...ChapterFields
      }
    }
  }
  ${MANGA_FRAGMENT}
  ${CHAPTER_FRAGMENT}
`;

// Lấy thông tin người dùng hiện tại
export const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    currentUser {
      id
      email
      username
      avatar
    }
  }
`;

// Lấy danh sách thể loại
export const GET_GENRES = gql`
  query GetGenres {
    genres {
      id
      name
    }
  }
`;

// MUTATIONS

// Thêm/xóa manga vào danh sách yêu thích
export const TOGGLE_FAVORITE = gql`
  mutation ToggleFavorite($mangaId: ID!) {
    toggleFavorite(input: { mangaId: $mangaId }) {
      isFavorite
      errors
    }
  }
`;

// Thêm vào lịch sử đọc truyện
export const CREATE_READING_HISTORY = gql`
  mutation CreateReadingHistory($mangaId: ID!, $chapterId: ID!) {
    createReadingHistory(input: { mangaId: $mangaId, chapterId: $chapterId }) {
      readingHistory {
        id
        lastReadAt
        manga {
          id
          title
        }
        chapter {
          id
          number
          title
        }
      }
      errors
    }
  }
`;

// Xóa một lịch sử đọc truyện
export const DELETE_READING_HISTORY = gql`
  mutation DeleteReadingHistory($id: ID!) {
    deleteReadingHistory(input: { id: $id }) {
      success
      errors
    }
  }
`;

// Xóa tất cả lịch sử đọc truyện
export const DELETE_ALL_READING_HISTORIES = gql`
  mutation DeleteAllReadingHistories {
    deleteAllReadingHistories(input: {}) {
      success
      errors
    }
  }
`;

// Thêm comment vào manga hoặc chapter
export const CREATE_COMMENT = gql`
  mutation CreateComment($commentableId: ID!, $commentableType: String!, $content: String!) {
    createComment(input: {
      commentableId: $commentableId,
      commentableType: $commentableType,
      content: $content
    }) {
      comment {
        id
        content
        user {
          id
          username
        }
        createdAt
      }
      errors
    }
  }
`;
