# Use Node.js 18 LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Generate GraphQL schema
RUN npm run codegen

# Expose port (Ponder default is 42069)
EXPOSE 42069

# Set environment variables
ENV NODE_ENV=production
ENV PONDER_DATABASE_URL="file:.ponder/pglite"
ENV DATABASE_SCHEMA="public"
ENV ROOT_NAME="celoo.eth"

# Start the indexer
CMD ["npm", "start"]
