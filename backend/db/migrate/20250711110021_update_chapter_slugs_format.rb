class UpdateChapterSlugsFormat < ActiveRecord::Migration[8.0]
  def up
    # Update all existing chapter slugs to use the new format
    Chapter.find_each do |chapter|
      # Generate new slug with the correct format - just use the integer part
      chapter_number = chapter.number.to_i
      base_slug = "chapter-#{chapter_number}"
      new_slug = base_slug
      counter = 2
      
      # Check if the slug already exists
      while Chapter.where(slug: new_slug).where.not(id: chapter.id).exists?
        new_slug = "#{base_slug}-#{counter}"
        counter += 1
      end
      
      # Update the slug
      chapter.update_column(:slug, new_slug)
    end
  end

  def down
    # No need to do anything for rollback
  end
end
