class AiService
  # Lựa chọn và sử dụng AI service phù hợp dựa trên môi trường
  def self.generate_text(prompt, options = {})
    # Sử dụng Gemini API
    if ENV['GEMINI_API_KEY'].present?
      response = GeminiService.generate_text(prompt, options)
      return response if response.present?
    end

    # Fallback nếu không có API key
    return "API key cho Gemini không được cấu hình. Vui lòng thiết lập GEMINI_API_KEY trong môi trường."
  end

  # Phân tích dữ liệu với AI
  def self.analyze_data(data_context, user_prompt, system_instruction = nil)
    # Sử dụng Gemini API
    if ENV['GEMINI_API_KEY'].present?
      return GeminiService.analyze_data(data_context, user_prompt, system_instruction)
    else
      # Trả về thông báo lỗi nếu không có API key
      return {
        response: "API key cho Gemini không được cấu hình. Vui lòng thiết lập GEMINI_API_KEY trong môi trường.",
        error: "Missing API key",
        success: false
      }
    end
  end
end
