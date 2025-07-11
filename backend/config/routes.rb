Rails.application.routes.draw do
  devise_for :users, controllers: {
    sessions: 'api/v1/sessions',
    registrations: 'api/v1/registrations',
    omniauth_callbacks: 'api/v1/omniauth_callbacks'
  }

  # Thêm route debug để kiểm tra
  get '/auth-test', to: 'home#auth_test'

  namespace :api do
    namespace :v1 do
      devise_scope :user do
        post 'auth/sign_in', to: 'sessions#create'
        delete 'auth/sign_out', to: 'sessions#destroy'
        post 'auth/sign_up', to: 'registrations#create'
        put 'auth/account', to: 'registrations#update'
        delete 'auth/account', to: 'registrations#destroy'
      end

      post 'auth/google_token', to: 'auth#google_token'

      # Proxy route for fetching external content
      get 'proxy/fetch', to: 'proxy#fetch_url'

      resources :mangas do
        resources :chapters, shallow: true do
          # Add nested routes for chapter comments
          resources :comments, only: [:index, :create], module: :chapters
        end
        resources :ratings, only: [:create, :update, :destroy], module: :mangas
        resources :comments, only: [:index, :create], module: :mangas
      end

      # Add a specific route for getting chapters with manga_id
      get 'mangas/:manga_id/chapters/:id', to: 'chapters#show'

      # Add route for updating chapters with manga_id
      put 'mangas/:manga_id/chapters/:id', to: 'chapters#update'

      # Add routes for chapter comments with manga_id
      get 'mangas/:manga_id/chapters/:chapter_id/comments', to: 'chapters/comments#index'
      post 'mangas/:manga_id/chapters/:chapter_id/comments', to: 'chapters/comments#create'

      # Add non-nested routes for chapters for backward compatibility
      resources :chapters, only: [:show, :update, :destroy] do
        resources :comments, only: [:index, :create], module: :chapters
      end

      resources :genres, only: [:index, :show, :create, :update, :destroy]

      resources :users, only: [] do
        collection do
          get :me, to: 'users#show_current_user'
          put :me, to: 'users#update_current_user'
          get :favorites, to: 'users#favorites'
          post 'favorites/:manga_id', to: 'users#toggle_favorite'
          get 'favorites/check/:manga_id', to: 'users#check_favorite'
        end
      end

      resources :favorites, only: [:create, :destroy]
      resources :reading_histories, only: [:index, :create]
      resources :comments, only: [:index, :create, :destroy]
    end
  end

  # Health check
  get "up" => "rails/health#show", as: :rails_health_check

  # Fallback route for SPA
  root to: 'home#index'
  get '*path', to: 'home#index', constraints: ->(req) { !req.xhr? && req.format.html? }

  # Admin routes
  namespace :admin do
    get :stats, to: 'dashboard#stats'
    resources :users, only: [:index] do
      member do
        put :role, to: 'users#update_role'
      end
    end
  end
end
