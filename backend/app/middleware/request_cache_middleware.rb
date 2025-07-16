class RequestCacheMiddleware
  def initialize(app)
    @app = app
  end

  def call(env)
    # Reset request-specific caches before each request
    ChapterService.reset_request_cache
    ChapterPresenterService.reset_request_cache

    # Process the request
    @app.call(env)
  end
end
