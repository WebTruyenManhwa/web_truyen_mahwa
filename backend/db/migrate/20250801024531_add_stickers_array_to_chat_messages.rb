class AddStickersArrayToChatMessages < ActiveRecord::Migration[8.0]
  def change
    add_column :chat_messages, :stickers, :string, array: true, default: []
  end
end
