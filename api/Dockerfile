# Stage 1: Development
FROM node:20-alpine AS development

WORKDIR /usr/src/app

# Install system dependencies for puppeteer with better error handling
RUN apk update && \
    apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont || \
    (echo "Chromium installation failed, installing minimal dependencies" && \
    apk add --no-cache nss freetype ca-certificates ttf-freefont && \
    echo "Warning: Chromium not installed, PDF generation may not work")

# Set Puppeteer to use the installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy package files
COPY package*.json ./

# Install dependencies including devDependencies
RUN npm install --include=dev

# Copy source code
COPY . .

# Expose development port
EXPOSE 3001

# Start in development mode with nodemon
CMD ["npm", "run", "dev"]

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /usr/src/app

# Install system dependencies for puppeteer with better error handling
RUN apk update && \
    apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont || \
    (echo "Chromium installation failed, installing minimal dependencies" && \
    apk add --no-cache nss freetype ca-certificates ttf-freefont && \
    echo "Warning: Chromium not installed, PDF generation may not work")

# Set Puppeteer to use the installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy package files
COPY package*.json ./

# Install production dependencies only
# Use npm install if no lock file exists, otherwise use npm ci
RUN if [ -f package-lock.json ]; then npm ci --only=production; else npm install --only=production && npm shrinkwrap; fi

# Copy built files from development stage
COPY --from=development /usr/src/app .

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p /var/log/vtria-erp /var/www/vtria-erp/uploads

# Set permissions
RUN chown -R node:node /var/log/vtria-erp /var/www/vtria-erp/uploads

# Switch to non-root user
USER node

# Expose production port
EXPOSE 5000

# Start in production mode
CMD ["npm", "start"]
