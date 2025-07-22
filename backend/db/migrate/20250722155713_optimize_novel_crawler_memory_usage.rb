class OptimizeNovelCrawlerMemoryUsage < ActiveRecord::Migration[8.0]
  def change
    # Thêm cột summary_result để lưu trữ tóm tắt kết quả crawl thay vì lưu toàn bộ dữ liệu lớn
    add_column :scheduled_jobs, :summary_result, :jsonb

    # Thêm cột memory_optimized để đánh dấu các job đã được tối ưu bộ nhớ
    add_column :scheduled_jobs, :memory_optimized, :boolean, default: false

    # Thêm index cho cột job_type để tối ưu truy vấn tìm kiếm theo loại job
    add_index :scheduled_jobs, :job_type
  end
end
