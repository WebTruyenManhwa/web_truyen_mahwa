class ChapterImageSerializer < ActiveModel::Serializer
  attributes :id, :position, :image_url, :is_external, :external_url, :created_at, :updated_at

  def image_url
    if object.is_external?
      object.external_url
    else
      return nil unless object.image.present?
      
      if Rails.env.development?
        # Trong development, thêm host vào URL
        host = "http://localhost:3001"
        if object.image.url.start_with?('/')
          "#{host}#{object.image.url}"
        else
          "#{host}/#{object.image.url}"
        end
      else
        object.image.url
      end
    end
  end
end 