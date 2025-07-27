class CreateChapterErrorReports < ActiveRecord::Migration[7.0]
  def change
    create_table :chapter_error_reports do |t|
      t.references :chapter, null: false, foreign_key: true
      t.references :user, foreign_key: true
      t.string :error_type, null: false
      t.text :description
      t.boolean :resolved, default: false
      t.datetime :resolved_at

      t.timestamps
    end

    add_index :chapter_error_reports, :resolved
  end
end
