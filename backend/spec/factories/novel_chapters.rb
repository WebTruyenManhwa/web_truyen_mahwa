FactoryBot.define do
  factory :novel_chapter do
    title { "MyString" }
    content { "MyText" }
    chapter_number { 1 }
    novel_series { nil }
    slug { "MyString" }
  end
end
