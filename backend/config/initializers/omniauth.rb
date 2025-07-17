# Allow both POST and GET for Google OAuth2
OmniAuth.config.allowed_request_methods = [:post, :get]
OmniAuth.config.logger = Rails.logger
# Silence the warning about GET requests
OmniAuth.config.silence_get_warning = true

# Set the path prefix for OmniAuth
OmniAuth.config.path_prefix = '/users/auth'
