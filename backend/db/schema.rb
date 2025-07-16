# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2025_07_16_165432) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "chapter_image_collections", force: :cascade do |t|
    t.bigint "chapter_id", null: false
    t.json "images", default: []
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["chapter_id"], name: "index_chapter_image_collections_on_chapter_id", unique: true
  end

  create_table "chapters", force: :cascade do |t|
    t.bigint "manga_id", null: false
    t.string "title"
    t.float "number"
    t.integer "view_count"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "slug"
    t.index ["manga_id", "number"], name: "idx_chapters_on_manga_id_number"
    t.index ["manga_id"], name: "index_chapters_on_manga_id"
    t.index ["slug"], name: "index_chapters_on_slug"
  end

  create_table "comments", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.text "content"
    t.string "commentable_type", null: false
    t.bigint "commentable_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "sticker"
    t.integer "parent_id"
    t.string "stickers"
    t.index ["commentable_type", "commentable_id"], name: "index_comments_on_commentable"
    t.index ["user_id"], name: "index_comments_on_user_id"
  end

  create_table "favorites", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "manga_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["manga_id"], name: "index_favorites_on_manga_id"
    t.index ["user_id"], name: "index_favorites_on_user_id"
  end

  create_table "genres", force: :cascade do |t|
    t.string "name"
    t.text "description"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "jwt_denylists", force: :cascade do |t|
    t.string "jti", null: false
    t.datetime "exp", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["jti"], name: "index_jwt_denylists_on_jti", unique: true
  end

  create_table "manga_genres", force: :cascade do |t|
    t.bigint "manga_id", null: false
    t.bigint "genre_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["genre_id"], name: "index_manga_genres_on_genre_id"
    t.index ["manga_id"], name: "index_manga_genres_on_manga_id"
  end

  create_table "manga_views", force: :cascade do |t|
    t.bigint "manga_id", null: false
    t.date "view_date", null: false
    t.integer "view_count", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["manga_id", "view_date"], name: "index_manga_views_on_manga_id_and_view_date", unique: true
    t.index ["manga_id"], name: "index_manga_views_on_manga_id"
    t.index ["view_date"], name: "index_manga_views_on_view_date"
  end

  create_table "mangas", force: :cascade do |t|
    t.string "title"
    t.text "description"
    t.string "cover_image"
    t.integer "status"
    t.string "author"
    t.string "artist"
    t.integer "release_year"
    t.integer "view_count"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.decimal "rating", precision: 3, scale: 2, default: "0.0"
    t.integer "total_votes", default: 0
    t.string "slug"
    t.index ["slug"], name: "index_mangas_on_slug", unique: true
  end

  create_table "novel_chapters", force: :cascade do |t|
    t.string "title"
    t.text "content"
    t.integer "chapter_number"
    t.bigint "novel_series_id", null: false
    t.string "slug"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.text "rendered_html"
    t.boolean "is_batch_chapter"
    t.integer "batch_start"
    t.integer "batch_end"
    t.index ["novel_series_id"], name: "index_novel_chapters_on_novel_series_id"
  end

  create_table "novel_series", force: :cascade do |t|
    t.string "title"
    t.string "author"
    t.text "description"
    t.string "cover_image"
    t.string "status"
    t.string "slug"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "ratings", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "manga_id", null: false
    t.integer "value", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["manga_id"], name: "index_ratings_on_manga_id"
    t.index ["user_id", "manga_id"], name: "index_ratings_on_user_id_and_manga_id", unique: true
    t.index ["user_id"], name: "index_ratings_on_user_id"
  end

  create_table "reading_histories", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "chapter_id", null: false
    t.integer "last_page"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "manga_id", null: false
    t.datetime "last_read_at"
    t.index ["chapter_id"], name: "index_reading_histories_on_chapter_id"
    t.index ["manga_id"], name: "index_reading_histories_on_manga_id"
    t.index ["user_id", "manga_id", "chapter_id"], name: "index_reading_histories_on_user_manga_chapter", unique: true
    t.index ["user_id"], name: "index_reading_histories_on_user_id"
  end

  create_table "solid_cache_entries", force: :cascade do |t|
    t.binary "key", null: false
    t.binary "value", null: false
    t.datetime "created_at", null: false
    t.bigint "key_hash", null: false
    t.integer "byte_size", null: false
    t.index ["byte_size"], name: "index_solid_cache_entries_on_byte_size"
    t.index ["key_hash", "byte_size"], name: "index_solid_cache_entries_on_key_hash_and_byte_size"
    t.index ["key_hash"], name: "index_solid_cache_entries_on_key_hash", unique: true
  end

  create_table "users", force: :cascade do |t|
    t.string "email"
    t.string "username"
    t.string "encrypted_password", default: "", null: false
    t.integer "role"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.string "provider"
    t.string "uid"
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
    t.index ["username"], name: "index_users_on_username", unique: true
  end

  add_foreign_key "chapter_image_collections", "chapters"
  add_foreign_key "chapters", "mangas"
  add_foreign_key "comments", "users"
  add_foreign_key "favorites", "mangas"
  add_foreign_key "favorites", "users"
  add_foreign_key "manga_genres", "genres"
  add_foreign_key "manga_genres", "mangas"
  add_foreign_key "manga_views", "mangas"
  add_foreign_key "novel_chapters", "novel_series"
  add_foreign_key "ratings", "mangas"
  add_foreign_key "ratings", "users"
  add_foreign_key "reading_histories", "chapters"
  add_foreign_key "reading_histories", "mangas"
  add_foreign_key "reading_histories", "users"
end
