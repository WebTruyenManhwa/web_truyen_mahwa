class AddIsHtmlToChatMessages < ActiveRecord::Migration[8.0]
  def change
    add_column :chat_messages, :is_html, :boolean, default: false
  end
end 