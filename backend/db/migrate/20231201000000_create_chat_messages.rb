class CreateChatMessages < ActiveRecord::Migration[7.0]
  def change
    create_table :chat_messages do |t|
      t.text :content
      t.string :sticker
      t.references :user, null: false, foreign_key: true
      
      t.timestamps
    end
    
    # Index để tối ưu hiệu suất truy vấn
    add_index :chat_messages, :created_at
  end
end 