require 'net/http'
require 'uri'

class Api::V1::ProxyController < Api::V1::BaseController
  skip_before_action :authenticate_user!, only: [:fetch_url]
  before_action :authenticate_admin!, only: [:batch_import_chapters]

  # GET /api/v1/proxy/fetch?url=https://example.com
  def fetch_url
    url = params[:url]
    result = UrlProxyService.fetch_url(url)

    if result[:error]
      render json: { error: result[:error] }, status: result[:status]
    else
      render plain: result[:body], content_type: result[:content_type]
    end
  end

  # POST /api/v1/proxy/batch_import_chapters
  # Params:
  # - manga_id: ID of the manga to add chapters to
  # - urls: Array of URLs to import chapters from
  # - auto_number: Boolean to auto-number chapters (default: true)
  # - start_number: Starting number for auto-numbering (default: 1)
  def batch_import_chapters
    manga_id = params[:manga_id]
    urls = params[:urls]

    unless manga_id.present? && urls.present? && urls.is_a?(Array)
      return render json: { error: 'manga_id and urls array are required' }, status: :bad_request
    end

    # Find the manga
    manga = Manga.find_by(id: manga_id)
    unless manga
      return render json: { error: 'Manga not found' }, status: :not_found
    end

    # Sử dụng service để import chapters
    results = ChapterImportService.batch_import(
      manga,
      urls,
      auto_number: params.fetch(:auto_number, true),
      start_number: params.fetch(:start_number, 1).to_f
    )

    render json: { results: results }
  end
end
