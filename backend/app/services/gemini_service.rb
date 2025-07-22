class GeminiService
  # Gọi Google Gemini API để phân tích văn bản
  def self.generate_text(prompt, options = {})
    # Kiểm tra xem có API key không
    api_key = ENV['GEMINI_API_KEY']

    if api_key.blank?
      Rails.logger.error("Gemini API key not found")
      return nil
    end

    # Cấu hình request
    require 'net/http'
    require 'uri'
    require 'json'

    # Xây dựng URL API - Lưu ý: gemini-2.0-flash là tên model, không phải endpoint
    model = options[:model] || "gemini-2.0-flash"
    uri = URI.parse("https://generativelanguage.googleapis.com/v1beta/models/#{model}:generateContent")

    # Tạo request
    request = Net::HTTP::Post.new(uri)
    request['Content-Type'] = 'application/json'
    request['X-goog-api-key'] = api_key  # Sử dụng header X-goog-api-key thay vì query param

    # Tăng giới hạn token để tránh bị cắt ngắn phản hồi
    max_tokens = options[:max_tokens] || 2000 # Tăng giới hạn mặc định từ 500 lên 2000

    # Cấu hình parameters cho request
    request_body = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: options[:temperature] || 0.7,
        maxOutputTokens: max_tokens,
        topP: 0.8,
        topK: 40
      }
    }

    request.body = request_body.to_json

    # Log request để debug
    Rails.logger.info("Gemini request URL: #{uri}")
    Rails.logger.info("Gemini request body: #{request_body}")

    # Gửi request và xử lý response
    begin
      response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) do |http|
        http.read_timeout = 60 # Tăng timeout lên 60 giây để xử lý các phản hồi dài
        http.request(request)
      end

      # Log response code và body để debug
      Rails.logger.info("Gemini response code: #{response.code}")
      Rails.logger.info("Gemini response body: #{response.body}")

      if response.code == '200'
        result = JSON.parse(response.body)

        # Xử lý response
        if result['candidates'] && result['candidates'].any? &&
           result['candidates'][0]['content'] &&
           result['candidates'][0]['content']['parts'] &&
           result['candidates'][0]['content']['parts'].any?

          # Trích xuất text từ phần đầu tiên của content
          text = result['candidates'][0]['content']['parts'][0]['text']

          # Kiểm tra xem phản hồi có bị cắt ngắn không
          finish_reason = result['candidates'][0]['finishReason']

          # Nếu phản hồi bị cắt ngắn và người dùng muốn tiếp tục
          if finish_reason == 'MAX_TOKENS' && options[:continue_if_truncated]
            # Thêm phần tiếp theo bằng cách gửi request mới với phần đã nhận được
            continuation = generate_continuation(text, prompt, api_key, model, options)

            if continuation.present?
              text += continuation
            end
          end

          return text
        else
          Rails.logger.error("Unexpected Gemini response format: #{result}")
          return nil
        end
      elsif response.code == '503'
        # Xử lý lỗi quá tải
        error_message = JSON.parse(response.body) rescue { "error" => { "message" => "Service Unavailable" } }
        Rails.logger.error("Gemini API error: #{response.body}")

        # Trả về thông báo lỗi thân thiện
        return "Xin lỗi, dịch vụ AI hiện đang quá tải. Vui lòng thử lại sau vài phút. (Lỗi: #{error_message['error']['message']})"
      else
        Rails.logger.error("Gemini API error: #{response.body}")
        return nil
      end
    rescue => e
      Rails.logger.error("Gemini API error: #{e.message}")
      return nil
    end
  end

  # Tạo phần tiếp theo cho phản hồi bị cắt ngắn
  def self.generate_continuation(previous_text, original_prompt, api_key, model, options)
    # Tạo prompt mới để tiếp tục từ phần trước
    continuation_prompt = "Tiếp tục từ phần trước:\n\n#{previous_text}\n\nTiếp tục phân tích và đề xuất:"

    # Xây dựng URL API
    uri = URI.parse("https://generativelanguage.googleapis.com/v1beta/models/#{model}:generateContent")

    # Tạo request
    request = Net::HTTP::Post.new(uri)
    request['Content-Type'] = 'application/json'
    request['X-goog-api-key'] = api_key

    # Cấu hình parameters cho request
    request_body = {
      contents: [
        {
          parts: [
            {
              text: continuation_prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: options[:temperature] || 0.7,
        maxOutputTokens: options[:max_tokens] || 2000,
        topP: 0.8,
        topK: 40
      }
    }

    request.body = request_body.to_json

    # Gửi request và xử lý response
    begin
      response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) do |http|
        http.read_timeout = 60
        http.request(request)
      end

      if response.code == '200'
        result = JSON.parse(response.body)

        if result['candidates'] && result['candidates'].any? &&
           result['candidates'][0]['content'] &&
           result['candidates'][0]['content']['parts'] &&
           result['candidates'][0]['content']['parts'].any?

          return result['candidates'][0]['content']['parts'][0]['text']
        end
      end
    rescue => e
      Rails.logger.error("Gemini continuation error: #{e.message}")
    end

    return nil
  end

  # Phân tích dữ liệu với Gemini
  def self.analyze_data(data_context, user_prompt, system_instruction = nil)
    # Tạo prompt hoàn chỉnh
    full_prompt = ""

    # Thêm system instruction nếu có
    if system_instruction.present?
      full_prompt += "#{system_instruction}\n\n"
    end

    # Thêm context dữ liệu nếu có
    if data_context.present?
      full_prompt += "Dữ liệu hệ thống:\n#{data_context}\n\n"
    end

    # Thêm yêu cầu của người dùng
    full_prompt += "Yêu cầu phân tích: #{user_prompt}"

    # Gọi Gemini để phân tích
    begin
      response = generate_text(full_prompt, { continue_if_truncated: true, max_tokens: 2000 })

      if response.present?
        # Kiểm tra xem response có phải là thông báo lỗi không
        if response.include?("Xin lỗi, dịch vụ AI hiện đang quá tải")
          return {
            response: response,
            success: false,
            error: "Service Unavailable"
          }
        else
          return {
            response: response,
            success: true
          }
        end
      else
        return {
          response: "Xin lỗi, có lỗi xảy ra khi phân tích dữ liệu. Vui lòng thử lại sau.",
          success: false,
          error: "Empty response from Gemini API"
        }
      end
    rescue => e
      Rails.logger.error("Gemini analysis error: #{e.message}")
      return {
        response: "Xin lỗi, có lỗi xảy ra khi phân tích dữ liệu. Vui lòng thử lại sau.",
        error: e.message,
        success: false
      }
    end
  end
end
