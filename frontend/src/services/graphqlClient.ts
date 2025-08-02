import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

// GraphQL endpoint URL
const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:3001/graphql';

// HTTP link for GraphQL requests
const httpLink = createHttpLink({
  uri: GRAPHQL_URL,
});

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors)
    graphQLErrors.forEach(({ message, locations, path }) =>
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
      ),
    );

  if (networkError) console.error(`[Network error]: ${networkError}`);
});

// Auth link to add token to requests
const authLink = setContext((_, { headers }) => {
  // Get the authentication token from local storage if it exists
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // Return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  };
});

// Create Apollo Client
export const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          // Merge function for paginated manga queries
          mangas: {
            keyArgs: ['filterByGenre', 'filterByStatus', 'search', 'sortBy', 'sortDirection'],
            merge(existing = [], incoming, { args }) {
              // If it's a new page, append the results
              if (args?.page && args.page > 1) {
                return [...existing, ...incoming];
              }
              // Otherwise replace the results
              return incoming;
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
  },
});

// GraphQL query fragments for reuse
export const MANGA_FRAGMENT = `
  fragment MangaFields on Manga {
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
`;

export const CHAPTER_FRAGMENT = `
  fragment ChapterFields on Chapter {
    id
    number
    title
    createdAt
    updatedAt
  }
`;

export const NOTIFICATION_FRAGMENT = `
  fragment NotificationFields on Notification {
    id
    title
    content
    notificationType
    read
    targetUrl
    createdAt
    user {
      id
      username
      avatar
    }
  }
`;

export default client;
