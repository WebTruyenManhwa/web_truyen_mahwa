# Hướng dẫn tích hợp GraphQL với Frontend

## Giới thiệu

Tài liệu này cung cấp hướng dẫn chi tiết về cách tích hợp GraphQL API với các ứng dụng frontend khác nhau.

## Cài đặt và cấu hình

### React với Apollo Client

1. Cài đặt các thư viện cần thiết:

```bash
npm install @apollo/client graphql
```

2. Cấu hình Apollo Client:

```javascript
// src/apollo/client.js
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

// Tạo HTTP link
const httpLink = createHttpLink({
  uri: 'http://localhost:3001/graphql',
});

// Thêm authentication headers
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  };
});

// Tạo Apollo Client
const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache()
});

export default client;
```

3. Tích hợp với React:

```javascript
// src/index.js
import React from 'react';
import ReactDOM from 'react-dom';
import { ApolloProvider } from '@apollo/client';
import client from './apollo/client';
import App from './App';

ReactDOM.render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>,
  document.getElementById('root')
);
```

## Sử dụng GraphQL trong React Components

### Query

```javascript
import { useQuery, gql } from '@apollo/client';

const GET_MANGAS = gql`
  query GetMangas($page: Int, $perPage: Int) {
    mangas(page: $page, perPage: $perPage) {
      id
      title
      coverImage
      status
    }
  }
`;

function MangaList() {
  const { loading, error, data } = useQuery(GET_MANGAS, {
    variables: { page: 1, perPage: 20 },
  });

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      <h2>Manga List</h2>
      <ul>
        {data.mangas.map(manga => (
          <li key={manga.id}>
            <img src={manga.coverImage} alt={manga.title} width="100" />
            <h3>{manga.title}</h3>
            <p>Status: {manga.status}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Mutation

```javascript
import { useMutation, gql } from '@apollo/client';

const TOGGLE_FAVORITE = gql`
  mutation ToggleFavorite($mangaId: ID!) {
    toggleFavorite(input: { mangaId: $mangaId }) {
      isFavorite
      errors
    }
  }
`;

function FavoriteButton({ mangaId }) {
  const [toggleFavorite, { loading, error }] = useMutation(TOGGLE_FAVORITE);

  const handleToggleFavorite = async () => {
    try {
      const { data } = await toggleFavorite({
        variables: { mangaId }
      });

      if (data.toggleFavorite.errors.length > 0) {
        alert(data.toggleFavorite.errors.join(', '));
        return;
      }

      alert(data.toggleFavorite.isFavorite ? 'Added to favorites!' : 'Removed from favorites!');
    } catch (e) {
      console.error('Error toggling favorite:', e);
    }
  };

  return (
    <button
      onClick={handleToggleFavorite}
      disabled={loading}
    >
      {loading ? 'Processing...' : 'Toggle Favorite'}
    </button>
  );
}
```

## Xử lý Authentication

### Đăng nhập và lưu token

```javascript
import { useMutation, gql } from '@apollo/client';

const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(input: { email: $email, password: $password }) {
      token
      user {
        id
        email
        username
      }
      errors
    }
  }
`;

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [login, { loading }] = useMutation(LOGIN);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const { data } = await login({
        variables: { email, password }
      });

      if (data.login.errors.length > 0) {
        alert(data.login.errors.join(', '));
        return;
      }

      // Lưu token vào localStorage
      localStorage.setItem('token', data.login.token);

      // Lưu thông tin user (nếu cần)
      localStorage.setItem('user', JSON.stringify(data.login.user));

      // Chuyển hướng đến trang chính
      window.location.href = '/';
    } catch (e) {
      console.error('Login error:', e);
      alert('Login failed. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

## Xử lý File Upload

GraphQL API hỗ trợ upload file thông qua `apollo_upload_server`. Để upload file từ frontend:

```javascript
import { useMutation, gql } from '@apollo/client';
import { createUploadLink } from 'apollo-upload-client';

// Thay thế httpLink bằng uploadLink trong cấu hình Apollo Client
const uploadLink = createUploadLink({
  uri: 'http://localhost:3001/graphql',
});

// Mutation để upload file
const UPLOAD_FILE = gql`
  mutation UploadFile($file: Upload!) {
    uploadFile(input: { file: $file }) {
      url
      errors
    }
  }
`;

function FileUploader() {
  const [uploadFile, { loading }] = useMutation(UPLOAD_FILE);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const { data } = await uploadFile({
        variables: { file }
      });

      if (data.uploadFile.errors.length > 0) {
        alert(data.uploadFile.errors.join(', '));
        return;
      }

      alert(`File uploaded successfully! URL: ${data.uploadFile.url}`);
    } catch (e) {
      console.error('Upload error:', e);
      alert('Upload failed. Please try again.');
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={handleFileChange}
        disabled={loading}
      />
      {loading && <p>Uploading...</p>}
    </div>
  );
}
```

## Tối ưu hóa Performance

### Caching

Apollo Client tự động cache kết quả của các query. Bạn có thể tùy chỉnh cache policy:

```javascript
const { loading, error, data } = useQuery(GET_MANGAS, {
  variables: { page: 1, perPage: 20 },
  fetchPolicy: 'cache-and-network', // Sử dụng cache nhưng vẫn fetch dữ liệu mới từ server
});
```

### Pagination

```javascript
function MangaListWithPagination() {
  const [page, setPage] = useState(1);
  const { loading, error, data, fetchMore } = useQuery(GET_MANGAS, {
    variables: { page, perPage: 10 },
  });

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);

    fetchMore({
      variables: { page: nextPage, perPage: 10 },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return {
          mangas: [...prev.mangas, ...fetchMoreResult.mangas]
        };
      }
    });
  };

  if (loading && !data) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      <ul>
        {data.mangas.map(manga => (
          <li key={manga.id}>{manga.title}</li>
        ))}
      </ul>
      <button onClick={loadMore} disabled={loading}>
        {loading ? 'Loading...' : 'Load More'}
      </button>
    </div>
  );
}
```

## Tài liệu tham khảo

- [Apollo Client Documentation](https://www.apollographql.com/docs/react/)
- [GraphQL Documentation](https://graphql.org/learn/)
- [GraphiQL IDE](http://localhost:3001/graphiql)
- [Example Queries](../examples/example_queries.graphql)
- [Example Mutations](../examples/example_mutations.graphql)
