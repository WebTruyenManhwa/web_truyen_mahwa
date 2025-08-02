# GraphQL API Documentation

## Overview

This document provides information about using the GraphQL API for the web_truyen_mahwa application.

## Getting Started

The GraphQL API endpoint is available at:
- Development: http://localhost:3001/graphql
- GraphiQL IDE: http://localhost:3001/graphiql (Development only)
- Simple Test UI: http://localhost:3001/graphql-test (Development only)

## REST API vs GraphQL API

Một số API REST đã được chuyển đổi sang GraphQL để tối ưu hiệu năng:

| REST API | GraphQL Equivalent | Lợi ích |
|----------|-------------------|---------|
| GET /api/v1/mangas | query { mangas } | Giảm overfetching, client chỉ lấy những trường cần thiết |
| GET /api/v1/mangas/:id | query { manga(id: "ID") } | Giảm overfetching, client chỉ lấy những trường cần thiết |
| GET /api/v1/rankings/day | query { rankings(period: "day") } | Hợp nhất 3 endpoint thành 1 query với tham số |
| GET /api/v1/rankings/week | query { rankings(period: "week") } | Hợp nhất 3 endpoint thành 1 query với tham số |
| GET /api/v1/rankings/month | query { rankings(period: "month") } | Hợp nhất 3 endpoint thành 1 query với tham số |
| GET /api/v1/chapters/:id | query { chapter(id: "ID") } | Giảm overfetching, client chỉ lấy những trường cần thiết |
| GET /api/v1/reading_histories | query { readingHistories } | Giảm overfetching, client chỉ lấy những trường cần thiết |
| POST /api/v1/reading_histories | mutation { createReadingHistory } | Cùng chức năng nhưng với cú pháp GraphQL |
| DELETE /api/v1/reading_histories/:id | mutation { deleteReadingHistory } | Cùng chức năng nhưng với cú pháp GraphQL |
| DELETE /api/v1/reading_histories | mutation { deleteAllReadingHistories } | Cùng chức năng nhưng với cú pháp GraphQL |
| POST /api/v1/favorites | mutation { toggleFavorite } | Hợp nhất thêm/xóa favorite thành 1 mutation |
| DELETE /api/v1/favorites/:id | mutation { toggleFavorite } | Hợp nhất thêm/xóa favorite thành 1 mutation |
| POST /api/v1/comments | mutation { createComment } | Cùng chức năng nhưng với cú pháp GraphQL |
| GET /api/v1/notifications | query { notifications } | Giảm overfetching, client chỉ lấy những trường cần thiết |
| GET /api/v1/notifications/unread_count | query { unreadNotificationsCount } | Có thể kết hợp với query notifications trong 1 request |
| POST /api/v1/notifications/:id/mark_as_read | mutation { markNotificationAsRead } | Cùng chức năng nhưng với cú pháp GraphQL |
| POST /api/v1/notifications/mark_all_as_read | mutation { markAllNotificationsAsRead } | Cùng chức năng nhưng với cú pháp GraphQL |
| DELETE /api/v1/notifications/:id | mutation { deleteNotification } | Cùng chức năng nhưng với cú pháp GraphQL |
| DELETE /api/v1/notifications/clear_all | mutation { clearAllNotifications } | Cùng chức năng nhưng với cú pháp GraphQL |

## Authentication

Authentication is handled through the existing authentication system. You need to include the authentication token in the request headers:

```
Authorization: Bearer your_jwt_token
```

## Testing with cURL

You can test the GraphQL API using cURL. Here are some examples:

### Get a list of mangas
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"query": "query { mangas(page: 1, perPage: 5) { id title } }"}' \
  http://localhost:3001/graphql
```

### Get a specific manga with its chapters
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"query": "query { manga(id: 20) { id title description chapters { id title number } } }"}' \
  http://localhost:3001/graphql
```

### Get manga rankings
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"query": "query { rankings(period: \"day\", limit: 5) { id title view_count } }"}' \
  http://localhost:3001/graphql
```

### Get a specific chapter with its images
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"query": "query { chapter(id: 217) { id title number images manga { id title } } }"}' \
  http://localhost:3001/graphql
```

### Get reading histories (requires authentication)
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{"query": "query { readingHistories { id manga { id title } chapter { id number title } } }"}' \
  http://localhost:3001/graphql
```

### Toggle favorite (requires authentication)
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{"query": "mutation { toggleFavorite(input: { mangaId: \"20\" }) { isFavorite errors } }"}' \
  http://localhost:3001/graphql
```

### Get notifications (requires authentication)
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{"query": "query { notifications { id title content read createdAt } unreadNotificationsCount }"}' \
  http://localhost:3001/graphql
```

### Mark notification as read (requires authentication)
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{"query": "mutation { markNotificationAsRead(input: { id: \"1\" }) { success errors } }"}' \
  http://localhost:3001/graphql
```

### Mark all notifications as read (requires authentication)
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{"query": "mutation { markAllNotificationsAsRead(input: {}) { success errors } }"}' \
  http://localhost:3001/graphql
```

## Available Queries

### Manga

```graphql
# Get a single manga by ID or slug
query GetManga($id: ID) {
  manga(id: $id) {
    id
    title
    description
    # Other fields...
  }
}

# Get a list of mangas with pagination and filtering
query GetMangas($page: Int, $perPage: Int, $query: String) {
  mangas(page: $page, perPage: $perPage, query: $query) {
    id
    title
    # Other fields...
  }
}

# Get manga rankings
query GetRankings($period: String, $limit: Int) {
  rankings(period: $period, limit: $limit) {
    id
    title
    coverImage
    viewCount
    rating
  }
}
```

### Chapter

```graphql
# Get a chapter by ID
query GetChapter($id: ID!) {
  chapter(id: $id) {
    id
    number
    title
    images
    # Other fields...
  }
}
```

### User

```graphql
# Get current user information
query GetCurrentUser {
  currentUser {
    id
    email
    # Other fields...
  }
}

# Get reading histories
query GetReadingHistories {
  readingHistories {
    id
    manga {
      id
      title
      coverImage
    }
    chapter {
      id
      number
      title
    }
    lastReadAt
  }
}
```

## Available Mutations

### Favorites

```graphql
# Toggle favorite status for a manga
mutation ToggleFavorite($mangaId: ID!) {
  toggleFavorite(input: { mangaId: $mangaId }) {
    isFavorite
    errors
  }
}
```

### Reading History

```graphql
# Create a reading history entry
mutation CreateReadingHistory($mangaId: ID!, $chapterId: ID!) {
  createReadingHistory(input: { mangaId: $mangaId, chapterId: $chapterId }) {
    readingHistory {
      id
      # Other fields...
    }
    errors
  }
}

# Delete a reading history entry
mutation DeleteReadingHistory($id: ID!) {
  deleteReadingHistory(input: { id: $id }) {
    success
    errors
  }
}

# Delete all reading history entries
mutation DeleteAllReadingHistories {
  deleteAllReadingHistories(input: {}) {
    success
    errors
  }
}
```

### Comments

```graphql
# Create a comment
mutation CreateComment($commentableId: ID!, $commentableType: String!, $content: String!) {
  createComment(input: {
    commentableId: $commentableId,
    commentableType: $commentableType,
    content: $content
  }) {
    comment {
      id
      content
      # Other fields...
    }
    errors
  }
}
```

### Notifications

```graphql
# Get notifications with pagination and filtering
query GetNotifications($page: Int, $perPage: Int, $read: Boolean) {
  notifications(page: $page, perPage: $perPage, read: $read) {
    id
    title
    content
    notificationType
    read
    targetUrl
    createdAt
  }
  unreadNotificationsCount
}

# Mark a notification as read
mutation MarkNotificationAsRead($id: ID!) {
  markNotificationAsRead(input: { id: $id }) {
    success
    errors
  }
}

# Mark all notifications as read
mutation MarkAllNotificationsAsRead {
  markAllNotificationsAsRead(input: {}) {
    success
    errors
  }
}

# Delete a notification
mutation DeleteNotification($id: ID!) {
  deleteNotification(input: { id: $id }) {
    success
    errors
  }
}

# Clear all notifications
mutation ClearAllNotifications {
  clearAllNotifications(input: {}) {
    success
    errors
  }
}
```

## Using the GraphQL Test UI

The application provides a simple GraphQL testing UI at http://localhost:3001/graphql-test. This interface allows you to:

1. Enter GraphQL queries in a text area
2. Execute them against the GraphQL API
3. View the JSON response

Example queries to try in the test UI:

```graphql
# Get top 5 manga
query {
  mangas(page: 1, perPage: 5) {
    id
    title
    coverImage
    status
  }
}

# Get a specific manga with its chapters
query {
  manga(id: 20) {
    id
    title
    description
    chapters {
      id
      title
      number
    }
  }
}

# Get manga rankings
query {
  rankings(period: "week", limit: 10) {
    id
    title
    coverImage
    viewCount
  }
}

# Get notifications with unread count
query {
  notifications(page: 1, perPage: 10) {
    id
    title
    content
    read
    createdAt
  }
  unreadNotificationsCount
}

# Mark a notification as read
mutation {
  markNotificationAsRead(input: { id: "1" }) {
    success
    errors
  }
}
```

## Example Usage with Apollo Client

```javascript
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

// Create HTTP link
const httpLink = createHttpLink({
  uri: 'http://localhost:3001/graphql',
});

// Add authentication headers
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  };
});

// Create Apollo Client
const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache()
});

// Example query
client.query({
  query: gql`
    query GetMangas {
      mangas(page: 1, perPage: 10) {
        id
        title
        coverImage
      }
    }
  `
}).then(result => console.log(result));
```

## Example Usage with Notifications API

```javascript
import { gql, useQuery } from '@apollo/client';

const GET_NOTIFICATIONS = gql`
  query {
    notifications {
      id
      title
      content
      read
      createdAt
    }
    unreadNotificationsCount
  }
`;

function NotificationsComponent() {
  const { loading, error, data } = useQuery(GET_NOTIFICATIONS);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      <h2>Notifications ({data.unreadNotificationsCount} unread)</h2>
      <ul>
        {data.notifications.map(notification => (
          <li key={notification.id}>
            <h3>{notification.title}</h3>
            <p>{notification.content}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Example Usage with Mutations for Notifications API

```javascript
import { gql, useMutation } from '@apollo/client';

const MARK_NOTIFICATION_AS_READ = gql`
  mutation MarkNotificationAsRead($id: ID!) {
    markNotificationAsRead(input: { id: $id }) {
      success
      errors
    }
  }
`;

function NotificationItem({ notification, onMarkAsRead }) {
  const [markAsRead, { loading }] = useMutation(MARK_NOTIFICATION_AS_READ, {
    variables: { id: notification.id },
    onCompleted: (data) => {
      if (data.markNotificationAsRead.success) {
        onMarkAsRead(notification.id);
      }
    }
  });

  return (
    <div>
      <h3>{notification.title}</h3>
      <p>{notification.content}</p>
      {!notification.read && (
        <button
          onClick={() => markAsRead()}
          disabled={loading}
        >
          {loading ? 'Marking...' : 'Mark as read'}
        </button>
      )}
    </div>
  );
}
```

## Additional Resources

- More example queries can be found in `app/graphql/examples/`
- For more information about GraphQL: https://graphql.org/
- For more information about the graphql-ruby gem: https://graphql-ruby.org/
