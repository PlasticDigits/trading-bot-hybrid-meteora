# Use a Node.js base image
FROM node:24-slim

# Install build dependencies
RUN apt-get update && apt-get install -y \
  python3 \
  make \
  g++ \
  curl \
  git \
  && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy only package files first to leverage Docker cache
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install

# Copy the rest of the project files
COPY . .
RUN yarn rebuild || true

# Default command
CMD ["yarn", "start"]
