Rails.application.routes.draw do
  devise_for :users, controllers: {
    sessions: 'api/v1/sessions',
    registrations: 'api/v1/registrations',
    omniauth_callbacks: 'api/v1/omniauth_callbacks'
  }

  # Health check routes
  get '/healthcheck', to: 'health#check'
  get '/', to: 'health#check', constraints: ->(req) { req.format.json? }

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

      # Admin routes
      namespace :admin do
        get 'dashboard/stats', to: 'dashboard#stats'

        # Admin routes for novel series
        resources :novel_series do
          resources :novel_chapters, shallow: true
        end
      end

      # Proxy route for fetching external content
      get 'proxy/fetch', to: 'proxy#fetch_url'
      post 'proxy/batch_import_chapters', to: 'proxy#batch_import_chapters'
      post 'proxy/crawl_manga', to: 'proxy#crawl_manga'
      post 'proxy/test_extract_images', to: 'proxy#test_extract_images'

      # Scheduled crawls
      resources :scheduled_crawls do
        member do
          post :run_now
        end
      end

      # Scheduled jobs
      resources :scheduled_jobs, only: [:index, :show] do
        member do
          post :retry
          post :cancel
        end

        collection do
          get :stats
        end
      end

      resources :mangas do
        resources :chapters, shallow: true do
          # Add nested routes for chapter comments
          resources :comments, only: [:index, :create], module: :chapters
        end
        resources :ratings, only: [:create, :update, :destroy], module: :mangas
        resources :comments, only: [:index, :create], module: :mangas

        collection do
          # Add routes for rankings
          get 'rankings/day', to: 'mangas#rankings_day'
          get 'rankings/week', to: 'mangas#rankings_week'
          get 'rankings/month', to: 'mangas#rankings_month'
          # Add route to clear rankings cache (admin only)
          post 'rankings/clear_cache', to: 'mangas#clear_rankings_cache'
        end

        # Add route for getting user's rating for a manga
        get 'ratings/user', to: 'mangas/ratings#show_user_rating'
      end

      # Novel series routes
      resources :novel_series, only: [:index, :show] do
        resources :novel_chapters, only: [:index, :show]
      end

      # Add a specific route for getting chapters with manga_id
      get 'mangas/:manga_id/chapters/:id', to: 'chapters#show'

      # Add route for updating chapters with manga_id
      put 'mangas/:manga_id/chapters/:id', to: 'chapters#update'

      # Add route for deleting chapters with manga_id
      delete 'mangas/:manga_id/chapters/:id', to: 'chapters#destroy'

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
