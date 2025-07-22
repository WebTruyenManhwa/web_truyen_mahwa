class AddIndexToNovelSeriesTitle < ActiveRecord::Migration[8.0]
  def change
    # Thêm index cho cột title của bảng novel_series
    # Sử dụng expression index để hỗ trợ tìm kiếm không phân biệt hoa thường
    add_index :novel_series, "lower(title)", name: "index_novel_series_on_lower_title"
  end
end
