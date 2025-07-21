class DeleteBackupFilesJob < ApplicationJob
  queue_as :default

  def perform(filepaths)
    Rails.logger.info "Starting DeleteBackupFilesJob for files: #{filepaths.join(', ')}"

    filepaths.each do |filepath|
      if File.exist?(filepath)
        begin
          File.delete(filepath)
          Rails.logger.info "Successfully deleted file: #{filepath}"
        rescue => e
          Rails.logger.error "Error deleting file #{filepath}: #{e.message}"
        end
      else
        Rails.logger.info "File not found for deletion: #{filepath}"
      end
    end

    Rails.logger.info "DeleteBackupFilesJob completed"
  end
end
