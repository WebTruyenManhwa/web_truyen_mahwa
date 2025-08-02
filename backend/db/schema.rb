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

ActiveRecord::Schema[8.0].define(version: 2025_08_01_024531) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "chapter_error_reports", force: :cascade do |t|
    t.bigint "chapter_id", null: false
    t.bigint "user_id"
    t.string "error_type", null: false
    t.text "description"
    t.boolean "resolved", default: false
    t.datetime "resolved_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["chapter_id"], name: "index_chapter_error_reports_on_chapter_id"
    t.index ["resolved"], name: "index_chapter_error_reports_on_resolved"
    t.index ["user_id"], name: "index_chapter_error_reports_on_user_id"
  end

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

  create_table "chat_messages", force: :cascade do |t|
    t.text "content"
    t.string "sticker"
    t.bigint "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "is_html", default: false
    t.string "stickers", default: [], array: true
    t.index ["created_at"], name: "index_chat_messages_on_created_at"
    t.index ["user_id"], name: "index_chat_messages_on_user_id"
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
    t.string "source_url"
    t.index ["slug"], name: "index_mangas_on_slug", unique: true
  end

  create_table "notifications", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "title", null: false
    t.text "content"
    t.boolean "read", default: false, null: false
    t.string "notification_type", null: false
    t.integer "reference_id"
    t.string "reference_type"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["notification_type"], name: "index_notifications_on_notification_type"
    t.index ["read"], name: "index_notifications_on_read"
    t.index ["reference_type", "reference_id"], name: "index_notifications_on_reference_type_and_reference_id"
    t.index ["user_id"], name: "index_notifications_on_user_id"
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
    t.index ["chapter_number"], name: "index_novel_chapters_on_chapter_number"
    t.index ["novel_series_id", "chapter_number"], name: "index_novel_chapters_on_novel_id_and_chapter_number", unique: true
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
    t.string "source_url"
    t.index "lower((title)::text)", name: "index_novel_series_on_lower_title"
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

  create_table "scheduled_crawls", force: :cascade do |t|
    t.bigint "manga_id", null: false
    t.string "url", null: false
    t.string "schedule_type", null: false
    t.time "schedule_time"
    t.string "schedule_days"
    t.string "max_chapters"
    t.string "chapter_range"
    t.string "delay"
    t.string "status", default: "active"
    t.datetime "last_run_at"
    t.datetime "next_run_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "auto_next_chapters", default: false
    t.index ["manga_id"], name: "index_scheduled_crawls_on_manga_id"
  end

  create_table "scheduled_jobs", force: :cascade do |t|
    t.string "job_type", null: false
    t.string "status", default: "pending", null: false
    t.datetime "scheduled_at", null: false
    t.datetime "started_at"
    t.datetime "completed_at"
    t.text "options"
    t.text "result"
    t.text "error_message"
    t.string "lock_token"
    t.integer "retry_count", default: 0
    t.integer "max_retries", default: 3
    t.bigint "parent_job_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.jsonb "summary_result"
    t.boolean "memory_optimized", default: false
    t.index ["job_type", "scheduled_at"], name: "index_scheduled_jobs_on_job_type_and_scheduled_at"
    t.index ["job_type"], name: "index_scheduled_jobs_on_job_type"
    t.index ["parent_job_id"], name: "index_scheduled_jobs_on_parent_job_id"
    t.index ["scheduled_at"], name: "index_scheduled_jobs_on_scheduled_at"
    t.index ["status"], name: "index_scheduled_jobs_on_status"
  end

  create_table "scheduler_locks", force: :cascade do |t|
    t.string "name", null: false
    t.integer "process_id", null: false
    t.datetime "locked_at", null: false
    t.datetime "heartbeat_at"
    t.index ["name"], name: "index_scheduler_locks_on_name", unique: true
  end

  create_table "solid_cable_messages", force: :cascade do |t|
    t.binary "channel", null: false
    t.binary "payload", null: false
    t.datetime "created_at", null: false
    t.bigint "channel_hash", null: false
    t.index ["channel"], name: "index_solid_cable_messages_on_channel"
    t.index ["channel_hash"], name: "index_solid_cable_messages_on_channel_hash"
    t.index ["created_at"], name: "index_solid_cable_messages_on_created_at"
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

  create_table "solid_queue_blocked_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.string "queue_name", null: false
    t.integer "priority", default: 0, null: false
    t.string "concurrency_key", null: false
    t.datetime "expires_at", null: false
    t.datetime "created_at", null: false
    t.index ["concurrency_key", "priority", "job_id"], name: "index_solid_queue_blocked_executions_for_release"
    t.index ["expires_at", "concurrency_key"], name: "index_solid_queue_blocked_executions_for_maintenance"
    t.index ["job_id"], name: "index_solid_queue_blocked_executions_on_job_id", unique: true
  end

  create_table "solid_queue_claimed_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.bigint "process_id"
    t.datetime "created_at", null: false
    t.index ["job_id"], name: "index_solid_queue_claimed_executions_on_job_id", unique: true
    t.index ["process_id", "job_id"], name: "index_solid_queue_claimed_executions_on_process_id_and_job_id"
  end

  create_table "solid_queue_failed_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.text "error"
    t.datetime "created_at", null: false
    t.index ["job_id"], name: "index_solid_queue_failed_executions_on_job_id", unique: true
  end

  create_table "solid_queue_jobs", force: :cascade do |t|
    t.string "queue_name", null: false
    t.string "class_name", null: false
    t.text "arguments"
    t.integer "priority", default: 0, null: false
    t.string "active_job_id"
    t.datetime "scheduled_at"
    t.datetime "finished_at"
    t.string "concurrency_key"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["active_job_id"], name: "index_solid_queue_jobs_on_active_job_id"
    t.index ["class_name"], name: "index_solid_queue_jobs_on_class_name"
    t.index ["finished_at"], name: "index_solid_queue_jobs_on_finished_at"
    t.index ["queue_name", "finished_at"], name: "index_solid_queue_jobs_for_filtering"
    t.index ["scheduled_at", "finished_at"], name: "index_solid_queue_jobs_for_alerting"
  end

  create_table "solid_queue_pauses", force: :cascade do |t|
    t.string "queue_name", null: false
    t.datetime "created_at", null: false
    t.index ["queue_name"], name: "index_solid_queue_pauses_on_queue_name", unique: true
  end

  create_table "solid_queue_processes", force: :cascade do |t|
    t.string "kind", null: false
    t.datetime "last_heartbeat_at", null: false
    t.bigint "supervisor_id"
    t.integer "pid", null: false
    t.string "hostname"
    t.text "metadata"
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.index ["last_heartbeat_at"], name: "index_solid_queue_processes_on_last_heartbeat_at"
    t.index ["name", "supervisor_id"], name: "index_solid_queue_processes_on_name_and_supervisor_id", unique: true
    t.index ["supervisor_id"], name: "index_solid_queue_processes_on_supervisor_id"
  end

  create_table "solid_queue_ready_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.string "queue_name", null: false
    t.integer "priority", default: 0, null: false
    t.datetime "created_at", null: false
    t.index ["job_id"], name: "index_solid_queue_ready_executions_on_job_id", unique: true
    t.index ["priority", "job_id"], name: "index_solid_queue_poll_all"
    t.index ["queue_name", "priority", "job_id"], name: "index_solid_queue_poll_by_queue"
  end

  create_table "solid_queue_recurring_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.string "task_key", null: false
    t.datetime "run_at", null: false
    t.datetime "created_at", null: false
    t.index ["job_id"], name: "index_solid_queue_recurring_executions_on_job_id", unique: true
    t.index ["task_key", "run_at"], name: "index_solid_queue_recurring_executions_on_task_key_and_run_at", unique: true
  end

  create_table "solid_queue_recurring_tasks", force: :cascade do |t|
    t.string "key", null: false
    t.string "schedule", null: false
    t.string "command", limit: 2048
    t.string "class_name"
    t.text "arguments"
    t.string "queue_name"
    t.integer "priority", default: 0
    t.boolean "static", default: true, null: false
    t.text "description"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["key"], name: "index_solid_queue_recurring_tasks_on_key", unique: true
    t.index ["static"], name: "index_solid_queue_recurring_tasks_on_static"
  end

  create_table "solid_queue_scheduled_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.string "queue_name", null: false
    t.integer "priority", default: 0, null: false
    t.datetime "scheduled_at", null: false
    t.datetime "created_at", null: false
    t.index ["job_id"], name: "index_solid_queue_scheduled_executions_on_job_id", unique: true
    t.index ["scheduled_at", "priority", "job_id"], name: "index_solid_queue_dispatch_all"
  end

  create_table "solid_queue_semaphores", force: :cascade do |t|
    t.string "key", null: false
    t.integer "value", default: 1, null: false
    t.datetime "expires_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["expires_at"], name: "index_solid_queue_semaphores_on_expires_at"
    t.index ["key", "value"], name: "index_solid_queue_semaphores_on_key_and_value"
    t.index ["key"], name: "index_solid_queue_semaphores_on_key", unique: true
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

  add_foreign_key "chapter_error_reports", "chapters"
  add_foreign_key "chapter_error_reports", "users"
  add_foreign_key "chapter_image_collections", "chapters"
  add_foreign_key "chapters", "mangas"
  add_foreign_key "chat_messages", "users"
  add_foreign_key "comments", "users"
  add_foreign_key "favorites", "mangas"
  add_foreign_key "favorites", "users"
  add_foreign_key "manga_genres", "genres"
  add_foreign_key "manga_genres", "mangas"
  add_foreign_key "manga_views", "mangas"
  add_foreign_key "notifications", "users"
  add_foreign_key "novel_chapters", "novel_series"
  add_foreign_key "ratings", "mangas"
  add_foreign_key "ratings", "users"
  add_foreign_key "reading_histories", "chapters"
  add_foreign_key "reading_histories", "mangas"
  add_foreign_key "reading_histories", "users"
  add_foreign_key "scheduled_crawls", "mangas"
  add_foreign_key "scheduled_jobs", "scheduled_jobs", column: "parent_job_id"
  add_foreign_key "solid_queue_blocked_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_claimed_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_failed_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_ready_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_recurring_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_scheduled_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
end
