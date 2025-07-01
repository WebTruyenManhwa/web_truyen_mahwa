class CreateReadingHistories < ActiveRecord::Migration[8.0]
  def change
    create_table :reading_histories do |t|
      t.references :user, null: false, foreign_key: true
      t.references :chapter, null: false, foreign_key: true
      t.integer :last_page

      t.timestamps
    end
  end
end
