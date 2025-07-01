Devise.setup do |config|
  config.jwt do |jwt|
    jwt.secret = ENV.fetch('DEVISE_JWT_SECRET_KEY', '16dc7505977755a53f100fc085faee27ddaf7fd96bb07d9c4d8b3c27ede20dcf78adbce30fe8295f32b819ff87459e328774d2d531e5e8d43ff2517a5427da52')
    jwt.dispatch_requests = [
      ['POST', %r{^/api/v1/auth/sign_in$}]
    ]
    jwt.revocation_requests = [
      ['DELETE', %r{^/api/v1/auth/sign_out$}]
    ]
    jwt.expiration_time = 1.day.to_i
  end
end 