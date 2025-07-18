class CoverImageUploader < CarrierWave::Uploader::Base
  # Include RMagick or MiniMagick support:
  # include CarrierWave::RMagick
  include CarrierWave::MiniMagick

  # Choose what kind of storage to use for this uploader:
  storage :file
  # storage :fog

  # Override the directory where uploaded files will be stored.
  # This is a sensible default for uploaders that are meant to be mounted:
  def store_dir
    "uploads/#{model.class.to_s.underscore}/#{mounted_as}/#{model.id}"
  end

  # Provide a default URL as a default if there hasn't been a file uploaded:
  def default_url(*args)
    # For Rails 3.1+ asset pipeline compatibility:
    # ActionController::Base.helpers.asset_path("fallback/" + [version_name, "default.png"].compact.join('_'))
    "/images/fallback/" + [version_name, "default_cover.png"].compact.join('_')
  end

  # Process files as they are uploaded:
  process resize_to_fit: [800, 1200]
  #
  # def scale(width, height)
  #   # do something
  # end

  # Create different versions of your uploaded files:
  version :thumb do
    process resize_to_fill: [300, 450]
  end

  version :small do
    process resize_to_fill: [200, 300]
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
        c.quality "80"
        c.depth "8"
        c.interlace "plane"
      end
      img
    end
  rescue => e
    Rails.logger.error "Failed to optimize image: #{e.message}"
    nil
  end

  # Override url method to handle remote URLs
  def url(version = nil)
    stored_value = model.read_attribute(mounted_as)

    if stored_value.present? && stored_value.start_with?('http')
      # Nếu là remote file thì chỉ cho phép truy cập original file
      return stored_value if version.nil?
      # Không tạo version trên file remote
      return default_url(version)
    end

    super(version)
  end
end
