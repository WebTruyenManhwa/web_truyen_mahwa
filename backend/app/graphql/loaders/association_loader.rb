# frozen_string_literal: true

module Loaders
  class AssociationLoader < GraphQL::Batch::Loader
    def initialize(model, association_name)
      @model = model
      @association_name = association_name
      validate
    end

    def perform(record_ids)
      records = @model.where(id: record_ids).includes(@association_name)
      records.each do |record|
        fulfill(record.id, record.public_send(@association_name))
      end
      record_ids.each { |id| fulfill(id, nil) unless fulfilled?(id) }
    end

    private

    def validate
      unless @model.reflect_on_association(@association_name)
        raise ArgumentError, "No association #{@association_name} on #{@model}"
      end
    end
  end
end
