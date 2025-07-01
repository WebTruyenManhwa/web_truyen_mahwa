require 'carrierwave/orm/activerecord'

CarrierWave.configure do |config|
  # Use local storage in development and test
  if Rails.env.development? || Rails.env.test?
    config.storage = :file
    config.enable_processing = Rails.env.development?
  else
    # Use AWS S3 in production
    # config.storage = :fog
    # config.fog_provider = 'fog/aws'
    # config.fog_credentials = {
    #   provider:              'AWS',
    #   aws_access_key_id:     Rails.application.credentials.dig(:aws, :access_key_id),
    #   aws_secret_access_key: Rails.application.credentials.dig(:aws, :secret_access_key),
    #   region:                'ap-southeast-1' # Change to your AWS region
    # }
    # config.fog_directory  = Rails.application.credentials.dig(:aws, :bucket)
    # config.fog_public     = false
    # config.fog_attributes = { cache_control: "public, max-age=#{365.days.to_i}" }
    
    # For now, use file storage in production too
    config.storage = :file
    config.enable_processing = true
  end

  # Override the directory where uploaded files will be stored.
  # This is a sensible default for uploaders that are meant to be mounted:
  config.root = Rails.root.join('public')
  
  # Set default URL for CarrierWave
  config.asset_host = "http://10.50.80.163:3001" if Rails.env.development?
  # config.asset_host = Rails.application.routes.default_url_options[:host]
  # Cache setting
  config.cache_storage = :file
  config.cache_dir = Rails.root.join('tmp', 'uploads')
  
  # Whitelist of content types
  # config.sanitize_regexp = /[^[:word:]\.\-\+]/
end