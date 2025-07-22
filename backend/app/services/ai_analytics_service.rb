class AiAnalyticsService
  # Lấy prompt cho AI phân tích dựa trên loại dữ liệu
  def self.get_prompt(data_type)
    case data_type
    when "retention"
      "Phân tích tỷ lệ giữ chân người dùng và đề xuất các chiến lược để cải thiện."
    when "content"
      "Phân tích nội dung được đọc nhiều nhất và đề xuất thể loại truyện nên được thêm vào."
    when "user_behavior"
      "Phân tích hành vi người dùng và đề xuất các tính năng mới để tăng tương tác."
    when "performance"
      "Phân tích hiệu suất trang web và đề xuất các cải tiến kỹ thuật."
    when "chat"
      "Trò chuyện với AI về trang web truyện manga."
    else
      "Phân tích dữ liệu và đưa ra các đề xuất để cải thiện trải nghiệm người dùng."
    end
  end

  # Phân tích dữ liệu với AI
  def self.analyze_data(data_type, user_prompt)
    # Lấy prompt cơ bản dựa trên loại phân tích
    base_prompt = get_prompt(data_type)

    # Tạo context dữ liệu cho AI dựa trên loại phân tích (trừ khi là chat)
    data_context = data_type == "chat" ? "" : get_data_context(data_type)

    # Hướng dẫn cho AI
    system_instruction = "Bạn là một chuyên gia phân tích dữ liệu cho trang web truyện manga. Hãy phân tích dữ liệu và đưa ra các đề xuất hữu ích, cụ thể và thực tế. Trả lời bằng tiếng Việt, ngắn gọn và dễ hiểu."

    # Nếu là chat, sử dụng hướng dẫn đơn giản hơn
    if data_type == "chat"
      system_instruction = "Bạn là một trợ lý AI giúp trả lời các câu hỏi về trang web truyện manga. Trả lời bằng tiếng Việt, ngắn gọn và dễ hiểu."
    end

    # Sử dụng AiService để phân tích dữ liệu
    result = AiService.analyze_data(data_context, user_prompt, system_instruction)

    # Trả về kết quả
    return {
      prompt: base_prompt,
      response: result[:response],
      success: result[:success],
      error: result[:error]
    }
  end

  private

  # Lấy context dữ liệu cho AI
  def self.get_data_context(data_type)
    context = ""

    case data_type
    when "retention"
      # Lấy dữ liệu về retention
      kpis = AdvancedAnalyticsService.get_key_performance_indicators[:kpis]
      context = "Tỷ lệ giữ chân người dùng:\n"
      context += "- 1 ngày: #{kpis[:retention][:day_1]}%\n"
      context += "- 7 ngày: #{kpis[:retention][:day_7]}%\n"
      context += "- 30 ngày: #{kpis[:retention][:day_30]}%\n"
      context += "DAU/MAU Ratio: #{kpis[:dau_mau_ratio]}\n"

    when "content"
      # Lấy dữ liệu về content
      genres = AdvancedAnalyticsService.get_genre_trends_over_time(1.month.ago)
      dropoff = AdvancedAnalyticsService.get_reading_dropoff_rate

      context = "Xu hướng thể loại trong tháng qua:\n"
      genres[:datasets].each do |dataset|
        context += "- #{dataset[:label]}: #{dataset[:data].sum} lượt đọc\n"
      end

      context += "\nTỷ lệ rời truyện:\n"
      dropoff[:labels].each_with_index do |label, index|
        context += "- #{label}: #{dropoff[:datasets][0][:data][index]}%\n"
      end

    when "user_behavior"
      # Lấy dữ liệu về user behavior
      segments = AdvancedAnalyticsService.get_user_segments[:segments]
      habits = AnalyticsService.get_reading_habits

      context = "Phân khúc người dùng:\n"
      segments.each do |segment|
        context += "- #{segment[:name]}: #{segment[:percentage]}%\n"
      end

      context += "\nThói quen đọc truyện:\n"
      context += "- Thời gian đọc trung bình: #{habits[:averageReadingTime]} phút\n"
      context += "- Giờ hoạt động nhiều nhất: #{habits[:mostActiveHour]}:00\n"
      context += "- Ngày hoạt động nhiều nhất: #{habits[:mostActiveDay]}\n"

    else # general
      # Lấy dữ liệu tổng quan
      kpis = AdvancedAnalyticsService.get_key_performance_indicators[:kpis]
      segments = AdvancedAnalyticsService.get_user_segments[:segments]

      context = "Thông số chính:\n"
      context += "- DAU: #{kpis[:dau]}\n"
      context += "- MAU: #{kpis[:mau]}\n"
      context += "- DAU/MAU Ratio: #{kpis[:dau_mau_ratio]}\n"
      context += "- Tỷ lệ giữ chân 7 ngày: #{kpis[:retention][:day_7]}%\n"

      context += "\nPhân khúc người dùng:\n"
      segments.each do |segment|
        context += "- #{segment[:name]}: #{segment[:percentage]}%\n"
      end
    end

    context
  end
end
