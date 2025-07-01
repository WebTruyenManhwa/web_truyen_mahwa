FactoryBot.define do
  factory :user do
    email { "MyString" }
    username { "MyString" }
    password_digest { "MyString" }
    role { 1 }
  end
end
