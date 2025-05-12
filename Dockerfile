#Node.js base image
FROM node:24.0.1-alpine

# Set working dir
WORKDIR /app

# Copy only package files
COPY package.json yarn.lock ./

# Install deps
RUN yarn install

# Copy the rest of the files
COPY . .

# Run
CMD ["yarn", "start"]
