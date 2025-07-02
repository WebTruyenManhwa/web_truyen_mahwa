class ChapterImageUploader < CarrierWave::Uploader::Base
  # Include RMagick or MiniMagick support:
  # include CarrierWave::RMagick
  include CarrierWave::MiniMagick

  # Choose what kind of storage to use for this uploader:
  # storage is configured in config/initializers/carrierwave.rb
  # storage :file
  # storage :fog

  # Override the directory where uploaded files will be stored.
  # This is a sensible default for uploaders that are meant to be mounted:
  def store_dir
    if Rails.env.production? || ENV['USE_S3'] == 'true'
      "chapter_images/#{model.id}"
    else
      "uploads/#{model.class.to_s.underscore}/#{mounted_as}/#{model.id}"
    end
  end

  # Provide a default URL as a default if there hasn't been a file uploaded:
  def default_url(*args)
    Rails.logger.debug "Default URL called for #{model.inspect}"
    if model.is_external?
      model.external_url
    else
      # Trả về nil nếu không có ảnh và không phải external
      nil
    end
  end

  # Process files as they are uploaded:
  process resize_to_fit: [1200, 1800]
  #
  # def scale(width, height)
  #   # do something
  # end

  # Add a callback after store to log the stored file path
  after :store, :log_store_result

  def log_store_result(file)
    Rails.logger.debug "File stored at: #{file.try(:path)}"
    Rails.logger.debug "File URL: #{url}"
    if file.nil?
      Rails.logger.debug "File is nil!"
    end
  end

  # Create different versions of your uploaded files:
  version :thumb do
    process resize_to_fill: [300, 450]
  end

  # Add an allowlist of extensions which are allowed to be uploaded.
  # For images you might use something like this:
  def extension_allowlist
    %w(jpg jpeg gif png webp svg)
  end

  # Override the filename of the uploaded files:
  # Avoid using model.id or version_name here, see uploader/store.rb for details.
  # def filename
  #   "something.jpg" if original_filename
  # end
  
  # Optimizing images
  process :optimize
  
  def optimize
    manipulate! do |img|
      img.strip
      img.combine_options do |c|
        c.quality "85"
        c.depth "8"
        c.interlace "plane"
      end
      img
    end
  end
end 