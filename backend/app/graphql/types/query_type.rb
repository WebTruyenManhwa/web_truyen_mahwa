module Types
  class QueryType < Types::BaseObject
    include GraphQL::Types::Relay::HasNodeField
    include GraphQL::Types::Relay::HasNodesField

    # Add root-level fields here.
    # They will be entry points for queries on your schema.

    # Manga queries
    field :manga, resolver: Resolvers::MangaResolver
    field :mangas, resolver: Resolvers::MangasResolver
    
    # Chapter queries
    field :chapter, resolver: Resolvers::ChapterResolver
    
    # User queries
    field :me, resolver: Resolvers::MeResolver
    
    # Genres
    field :genres, [Types::GenreType], null: false
    
    def genres
      Genre.all
    end
  end
end
