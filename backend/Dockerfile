# check=error=true

# This Dockerfile is designed for production, not development. Use with Kamal or build'n'run by hand:
# docker build -t backend .
# docker run -d -p 80:80 -e RAILS_MASTER_KEY=<value from config/master.key> --name backend backend

# For a containerized dev environment, see Dev Containers: https://guides.rubyonrails.org/getting_started_with_devcontainer.html

# Make sure RUBY_VERSION matches the Ruby version in .ruby-version
ARG RUBY_VERSION=3.3.0
FROM docker.io/library/ruby:$RUBY_VERSION-slim AS base

# Rails app lives here
WORKDIR /rails

# Install base packages
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
      build-essential \
      git \
      libpq-dev \
      libyaml-dev \
      pkg-config \
      ca-certificates \
      curl \
      libjemalloc2 \
      libvips \
      postgresql-client \
      imagemagick && \
    rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*

# Set production environment
ENV RAILS_ENV="production" \
    BUNDLE_DEPLOYMENT="1" \
    BUNDLE_PATH="/usr/local/bundle" \
    BUNDLE_WITHOUT="development"

# Throw-away build stage to reduce size of final image
FROM base AS build

RUN mkdir -p /usr/local/bundle && chmod -R 777 /usr/local/bundle

# Install packages needed to build gems
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential git libpq-dev libyaml-dev pkg-config && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Install application gems
COPY Gemfile Gemfile.lock ./
RUN bundle config set frozen false
RUN bundle install && \
    rm -rf ~/.bundle/ "${BUNDLE_PATH}"/ruby/*/cache "${BUNDLE_PATH}"/ruby/*/bundler/gems/*/.git && \
    bundle exec bootsnap precompile --gemfile

# Copy application code
COPY . .

# Precompile bootsnap code for faster boot times
RUN bundle exec bootsnap precompile app/ lib/

# Final stage for app image
FROM base

# Copy built artifacts: gems, application
COPY --from=build "${BUNDLE_PATH}" "${BUNDLE_PATH}"
COPY --from=build /rails /rails

# Tạo group và user rails (idempotent)
RUN getent group rails >/dev/null || groupadd --system --gid 1000 rails \
 && id -u rails >/dev/null 2>&1 || useradd --uid 1000 --gid 1000 --create-home --shell /bin/bash rails

# Tạo thư mục cần thiết và chown đúng path: /rails chứ không phải /app
RUN mkdir -p /rails/public/uploads /rails/tmp/sockets /rails/tmp/pids \
 && chown -R rails:rails /rails /rails/public/uploads /rails/tmp /rails/log /rails/storage

# Chuyển xuống chạy dưới user rails
USER rails

# Entrypoint chuẩn bị DB
COPY --chown=root:root --chmod=755 entrypoint.sh /rails/entrypoint.sh
ENTRYPOINT ["sh", "/rails/entrypoint.sh"]

# Mở port và khởi server
EXPOSE 80
CMD ["./bin/thrust", "./bin/rails", "server"]
