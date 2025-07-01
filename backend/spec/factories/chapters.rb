FactoryBot.define do
  factory :chapter do
    manga { nil }
    title { "MyString" }
    number { 1.5 }
    view_count { 1 }
  end
end
