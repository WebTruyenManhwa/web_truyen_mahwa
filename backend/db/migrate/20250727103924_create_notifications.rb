class CreateNotifications < ActiveRecord::Migration[8.0]
  def change
    create_table :notifications do |t|
      t.references :user, null: false, foreign_key: true
      t.string :title, null: false
      t.text :content
      t.boolean :read, default: false, null: false
      t.string :notification_type, null: false
      t.integer :reference_id
      t.string :reference_type

      t.timestamps
    end

    add_index :notifications, :read
    add_index :notifications, :notification_type
    add_index :notifications, [:reference_type, :reference_id]
  end
end
