# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end

# Tạo các thể loại
genres = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Horror',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Supernatural',
  'Thriller'
]

genres.each do |name|
  Genre.find_or_create_by(name: name)
end

puts "Created #{Genre.count} genres"

# Tạo một số manga mẫu
mangas = [
  {
    title: 'One Piece',
    description: 'Follow Monkey D. Luffy and his swashbuckling crew in their search for the ultimate treasure, the One Piece.',
    author: 'Eiichiro Oda',
    artist: 'Eiichiro Oda',
    status: 'ongoing',
    release_year: 1999,
    genres: ['Action', 'Adventure', 'Comedy', 'Fantasy']
  },
  {
    title: 'Naruto',
    description: 'Naruto Uzumaki, a mischievous adolescent ninja, struggles as he searches for recognition and dreams of becoming the Hokage, the village\'s leader and strongest ninja.',
    author: 'Masashi Kishimoto',
    artist: 'Masashi Kishimoto',
    status: 'completed',
    release_year: 1999,
    genres: ['Action', 'Adventure', 'Fantasy']
  },
  {
    title: 'Attack on Titan',
    description: 'In a world where humanity lives inside cities surrounded by enormous walls due to the Titans, gigantic humanoid creatures who devour humans seemingly without reason.',
    author: 'Hajime Isayama',
    artist: 'Hajime Isayama',
    status: 'completed',
    release_year: 2009,
    genres: ['Action', 'Drama', 'Fantasy', 'Horror']
  },
  {
    title: 'My Hero Academia',
    description: 'In a world where people with superpowers (known as "Quirks") are the norm, Izuku Midoriya has dreams of one day becoming a Hero, despite being bullied by his classmates for not having a Quirk.',
    author: 'Kohei Horikoshi',
    artist: 'Kohei Horikoshi',
    status: 'ongoing',
    release_year: 2014,
    genres: ['Action', 'Adventure', 'Comedy']
  },
  {
    title: 'Demon Slayer',
    description: 'Tanjiro Kamado\'s life changed when his family was slaughtered by demons, and his sister Nezuko was transformed into one. He joins the Demon Slayer Corps to avenge his family and cure his sister.',
    author: 'Koyoharu Gotouge',
    artist: 'Koyoharu Gotouge',
    status: 'completed',
    release_year: 2016,
    genres: ['Action', 'Fantasy', 'Supernatural']
  }
]

mangas.each do |manga_data|
  genre_names = manga_data.delete(:genres)
  manga = Manga.find_or_create_by(title: manga_data[:title]) do |m|
    m.assign_attributes(manga_data)
  end
  
  genre_names.each do |genre_name|
    genre = Genre.find_by(name: genre_name)
    if genre && !manga.genres.include?(genre)
      manga.genres << genre
    end
  end
end

puts "Created #{Manga.count} mangas"

# Tạo một số chapter cho mỗi manga
Manga.all.each do |manga|
  rand(5..10).times do |i|
    chapter_number = i + 1
    chapter = manga.chapters.find_or_create_by(number: chapter_number) do |c|
      c.title = "Chapter #{chapter_number}"
    end
    
    # Tạo một số ảnh cho mỗi chapter
    rand(10..20).times do |j|
      chapter.chapter_images.find_or_create_by(position: j + 1) do |ci|
        ci.image = "https://picsum.photos/800/1200?random=#{manga.id}-#{chapter_number}-#{j+1}"
      end
    end
  end
end

puts "Created chapters and images for all mangas"
