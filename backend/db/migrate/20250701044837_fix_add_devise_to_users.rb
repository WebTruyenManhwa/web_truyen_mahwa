class FixAddDeviseToUsers < ActiveRecord::Migration[8.0]
  def change
    change_table :users do |t|
      # Thay đổi trường password_digest thành encrypted_password
      t.rename :password_digest, :encrypted_password
      t.change :encrypted_password, :string, null: false, default: ""
      
      # Thêm các trường Devise cần thiết
      t.string   :reset_password_token
      t.datetime :reset_password_sent_at
      t.datetime :remember_created_at
    end
    
    # Thêm index cho reset_password_token
    add_index :users, :reset_password_token, unique: true
  end
end
