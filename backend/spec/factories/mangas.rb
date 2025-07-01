FactoryBot.define do
  factory :manga do
    title { "MyString" }
    description { "MyText" }
    cover_image { "MyString" }
    status { 1 }
    author { "MyString" }
    artist { "MyString" }
    release_year { 1 }
    view_count { 1 }
  end
end
