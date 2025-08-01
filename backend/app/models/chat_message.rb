class ChatMessage < ApplicationRecord
  belongs_to :user
  
  validates :content, presence: true, unless: :has_stickers?
  validates :content, length: { maximum: 1000 }
  
  # Kiểm tra xem message có sticker không
  def has_stickers?
    sticker.present? || (stickers.present? && stickers.any?)
  end
  
  # Chuẩn hóa dữ liệu trước khi lưu
  before_save :sanitize_content
  
  # Phương thức để lấy thông tin cần thiết cho JSON
  def as_json(options = {})
    super(options.merge(
      include: { user: { only: [:id, :username] } },
      methods: [:username, :avatar]
    ))
  end
  
  # Lấy username từ user
  def username
    user&.username
  end
  
  # Lấy avatar từ user (trả về nil nếu không có)
  def avatar
    nil # User hiện tại không có thuộc tính avatar
  end
  
  private
  
  def sanitize_content
    # Loại bỏ các ký tự không mong muốn
    self.content = content.strip if content.present?
  end
end