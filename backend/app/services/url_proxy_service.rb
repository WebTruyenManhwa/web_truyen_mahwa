require 'net/http'
require 'uri'

class UrlProxyService
  def self.fetch_url(url)
    unless url.present?
      return { error: 'URL parameter is required', status: :bad_request }
    end

    begin
      uri = URI.parse(url)
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = (uri.scheme == 'https')

      # Skip SSL verification (IMPORTANT: In production, this should be properly configured)
      http.verify_mode = OpenSSL::SSL::VERIFY_NONE if Rails.env.development?

      # Set a reasonable timeout
      http.open_timeout = 10
      http.read_timeout = 10

      # Create the request object
      request = Net::HTTP::Get.new(uri.request_uri)

      # Add common headers to make the request look legitimate
      request['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      request['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      request['Accept-Language'] = 'en-US,en;q=0.5'
      request['Connection'] = 'keep-alive'
      request['Upgrade-Insecure-Requests'] = '1'
      request['Cache-Control'] = 'max-age=0'

      # Send the request and get the response
      response = http.request(request)

      # Return the response with appropriate headers
      { body: response.body, content_type: response['Content-Type'], status: :ok }
    rescue => e
      Rails.logger.error("Proxy error: #{e.message}")
      { error: "Failed to fetch URL: #{e.message}", status: :internal_server_error }
    end
  end
end
