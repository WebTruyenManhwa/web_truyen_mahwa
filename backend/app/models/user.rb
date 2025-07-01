class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable,
         :jwt_authenticatable, :omniauthable

  # Cấu hình JWT
  self.jwt_revocation_strategy = JwtDenylist
  
  # OmniAuth providers
  def self.omniauth_providers
    [:google_oauth2]
  end

  # Enums
  enum :role, { user: 0, admin: 1 }, default: :user

  # Associations
  has_many :comments, dependent: :destroy
  has_many :favorites, dependent: :destroy
  has_many :favorite_mangas, through: :favorites, source: :manga
  has_many :reading_histories, dependent: :destroy

  # Validations
  validates :email, presence: true, uniqueness: { case_sensitive: false }
  validates :username, presence: true, uniqueness: { case_sensitive: false }, length: { minimum: 3, maximum: 20 }
  validates :password, presence: true, length: { minimum: 6 }, on: :create
  validates :password, length: { minimum: 6 }, allow_blank: true, on: :update

  # Xử lý thông tin từ OAuth provider
  def self.from_omniauth(auth)
    where(provider: auth.provider, uid: auth.uid).first_or_create do |user|
      user.email = auth.info.email
      user.password = Devise.friendly_token[0, 20]
      
      # Tạo username hợp lệ từ tên Google
      raw_name = auth.info.name || "user"
      sanitized_name = raw_name.gsub(/[^\w\s]/, '').gsub(/\s+/, '_')
      base_username = sanitized_name[0...15]
      user.username = "#{base_username}_#{SecureRandom.hex(2)}"
      # Có thể thêm các trường khác như avatar_url = auth.info.image
    end
  rescue ActiveRecord::RecordInvalid => e
    Rails.logger.error("OAuth user creation failed: #{e.message}")
    nil
  end
end