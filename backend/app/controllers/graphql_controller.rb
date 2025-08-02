# frozen_string_literal: true

class GraphqlController < ApplicationController
  # GraphQL không cần CSRF protection vì nó sử dụng JWT authentication

  def execute
    variables = prepare_variables(params[:variables])
    query = params[:query]
    operation_name = params[:operationName]
    context = {
      # Thêm current_user vào context để có thể sử dụng trong resolvers
      current_user: current_user,
      # Thêm request vào context để có thể lấy remote_ip
      request: request
    }
    result = WebTruyenMahwaSchema.execute(query, variables: variables, context: context, operation_name: operation_name)
    render json: result
  rescue StandardError => e
    raise e unless Rails.env.development?
    handle_error_in_development(e)
  end

  # Thêm action test để test GraphQL trực tiếp
  def test
    render html: <<~HTML.html_safe
      <!DOCTYPE html>
      <html>
        <head>
          <title>GraphQL Tester</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            #query { width: 100%; height: 200px; }
            #response { width: 100%; height: 300px; background: #f0f0f0; margin-top: 10px; overflow: auto; }
            button { margin-top: 10px; padding: 8px 16px; background: #4CAF50; color: white; border: none; cursor: pointer; }
          </style>
        </head>
        <body>
          <h1>GraphQL Tester</h1>
          <textarea id="query" placeholder="Enter your GraphQL query here...">
query {
  mangas(page: 1, perPage: 5) {
    id
    title
  }
}
          </textarea>
          <div>
            <button onclick="executeQuery()">Execute Query</button>
          </div>
          <pre id="response"></pre>

          <script>
            function executeQuery() {
              const query = document.getElementById('query').value;

              fetch('/graphql', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
                body: JSON.stringify({ query })
              })
              .then(response => response.json())
              .then(result => {
                document.getElementById('response').textContent = JSON.stringify(result, null, 2);
              })
              .catch(error => {
                document.getElementById('response').textContent = 'Error: ' + error;
              });
            }
          </script>
        </body>
      </html>
    HTML
  end

  private

  # Sử dụng lại current_user từ application controller hoặc warden
  def current_user
    @current_user ||= begin
      warden.authenticate(scope: :user)
    end
  end

  # Handle variables in form data, JSON body, or a blank value
  def prepare_variables(variables_param)
    case variables_param
    when String
      if variables_param.present?
        JSON.parse(variables_param) || {}
      else
        {}
      end
    when Hash
      variables_param
    when ActionController::Parameters
      variables_param.to_unsafe_hash # GraphQL-Ruby will validate name and type of incoming variables.
    when nil
      {}
    else
      raise ArgumentError, "Unexpected parameter: #{variables_param}"
    end
  end

  def handle_error_in_development(e)
    logger.error e.message
    logger.error e.backtrace.join("\n")

    render json: { errors: [{ message: e.message, backtrace: e.backtrace }], data: {} }, status: 500
  end
end
