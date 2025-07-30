# AnyCable configuration
# See: https://docs.anycable.io/ruby/configuration

AnyCable.configure do |config|
  # Sử dụng Postgres adapter thay vì Redis
  config.broadcast_adapter = :postgres
  
  # Nếu cần xác thực JWT
  # config.jwt_verification = true
  # config.jwt_secret = ENV.fetch("JWT_SECRET")
end