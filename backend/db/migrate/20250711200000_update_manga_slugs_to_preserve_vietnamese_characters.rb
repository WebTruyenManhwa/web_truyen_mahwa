class UpdateMangaSlugsToPreserveVietnameseCharacters < ActiveRecord::Migration[8.0]
  def up
    # Custom slugify method to preserve Vietnamese characters
    def custom_slugify(text)
      # Replace spaces with hyphens
      result = text.gsub(/\s+/, '-')

      # Remove special characters except Vietnamese ones
      result = result.gsub(/[^\p{L}\p{N}\-]/u, '')

      # Convert to lowercase
      result = result.downcase

      # Replace multiple hyphens with a single one
      result = result.gsub(/-+/, '-')

      # Remove leading and trailing hyphens
      result = result.gsub(/^-|-$/, '')

      result
    end

    # Update all existing manga slugs
    Manga.find_each do |manga|
      # Generate new slug with Vietnamese characters preserved
      base_slug = custom_slugify(manga.title)
      new_slug = base_slug
      counter = 2

      # Check if the slug already exists (excluding the current manga)
      while Manga.where(slug: new_slug).where.not(id: manga.id).exists?
        new_slug = "#{base_slug}-#{counter}"
        counter += 1
      end

      # Update the slug
      manga.update_column(:slug, new_slug)
    end
  end

  def down
    # This migration is not reversible as it would be difficult to restore the original slugs
  end
end
