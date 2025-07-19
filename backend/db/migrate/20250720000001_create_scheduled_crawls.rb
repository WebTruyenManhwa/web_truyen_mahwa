class CreateScheduledCrawls < ActiveRecord::Migration[8.0]
  def change
    create_table :scheduled_crawls do |t|
      t.references :manga, null: false, foreign_key: true
      t.string :url, null: false
      t.string :schedule_type, null: false  # daily, weekly, monthly
      t.time :schedule_time                 # thời gian trong ngày để chạy
      t.string :schedule_days               # các ngày trong tuần để chạy (đối với weekly), format: "1,2,3" (thứ 2, 3, 4)
      t.string :max_chapters                # số chương tối đa hoặc "all"
      t.string :chapter_range               # range chương, format: "1-10"
      t.string :delay                       # delay giữa các request, format: "2..5"
      t.string :status, default: 'active'   # active, paused, completed
      t.datetime :last_run_at               # thời gian chạy lần cuối
      t.datetime :next_run_at               # thời gian chạy lần tiếp theo

      t.timestamps
    end
  end
end
