require 'carrierwave/orm/activerecord'
require 'carrierwave/storage/abstract'
require 'carrierwave/storage/file'
require 'carrierwave/storage/fog'

CarrierWave.configure do |config|
  if ENV['USE_S3'] == 'true' &&
    ENV['AWS_ACCESS_KEY_ID'].to_s.strip != "" &&
    ENV['AWS_SECRET_ACCESS_KEY'].to_s.strip != "" &&
    ENV['AWS_REGION'].to_s.strip != "" &&
    ENV['AWS_BUCKET'].to_s.strip != ""

   config.storage        = :fog
   config.fog_provider   = 'fog/aws'
   config.fog_credentials = {
     provider:              'AWS',
     aws_access_key_id:     ENV['AWS_ACCESS_KEY_ID'],
     aws_secret_access_key: ENV['AWS_SECRET_ACCESS_KEY'],
     region:                ENV['AWS_REGION'],
     endpoint:              ENV['AWS_S3_ENDPOINT'].presence
   }
   config.fog_directory  = ENV['AWS_BUCKET']
   config.fog_public     = true
   config.fog_attributes = { cache_control: "public, max-age=#{365.days.to_i}" }
  else
    config.storage = :file
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