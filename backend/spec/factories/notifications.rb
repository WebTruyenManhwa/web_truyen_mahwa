FactoryBot.define do
  factory :notification do
    user { nil }
    title { "MyString" }
    content { "MyText" }
    read { false }
    notification_type { "MyString" }
    reference_id { 1 }
    reference_type { "MyString" }
  end
end
