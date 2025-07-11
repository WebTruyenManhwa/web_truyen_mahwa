class RemoveUniqueConstraintFromChapterSlugs < ActiveRecord::Migration[8.0]
  def up
    # Remove the unique index on chapter slugs
    remove_index :chapters, :slug
    
    # Add a non-unique index for performance
    add_index :chapters, :slug
    
    # Update all chapter slugs to the simple format
    Chapter.find_each do |chapter|
      chapter_number = chapter.number.to_i
      chapter.update_column(:slug, "chapter-#{chapter_number}")
    end
  end

  def down
    # Remove the non-unique index
    remove_index :chapters, :slug
    
    # Re-add the unique index
    add_index :chapters, :slug, unique: true
  end
end
