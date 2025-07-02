class CreateRatings < ActiveRecord::Migration[8.0]
  def change
    create_table :ratings do |t|
      t.references :user, null: false, foreign_key: true
      t.references :manga, null: false, foreign_key: true
      t.integer :value, null: false

      t.timestamps
    end

    add_index :ratings, [:user_id, :manga_id], unique: true
  end
end 