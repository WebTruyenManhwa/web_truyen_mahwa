class MangaSerializer < ActiveModel::Serializer
  attributes :id, :title, :description, :cover_image, :status, :author, :artist, 
             :release_year, :view_count, :rating, :total_votes, :created_at, :updated_at
             
  has_many :genres
  has_many :chapters

  def view_count
    object.view_count.to_i
  end

  def rating
    object.rating.to_f
  end

  def total_votes
    object.total_votes.to_i
  end
end 