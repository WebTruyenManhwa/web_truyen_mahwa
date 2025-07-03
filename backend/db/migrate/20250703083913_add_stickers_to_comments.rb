class AddStickersToComments < ActiveRecord::Migration[8.0]
  def change
    add_column :comments, :stickers, :string
  end
end
