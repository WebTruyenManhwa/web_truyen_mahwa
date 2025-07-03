class AddStickerAndParentIdToComments < ActiveRecord::Migration[8.0]
  def change
    add_column :comments, :sticker, :string
    add_column :comments, :parent_id, :integer
  end
end
