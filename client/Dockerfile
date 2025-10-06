# Stage 1: Development
FROM node:20-alpine AS development

WORKDIR /usr/src/app

# Install development dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source code and public files
COPY public/ ./public/
COPY src/ ./src/
COPY config-overrides.js ./
COPY .env* ./

# Expose development port
EXPOSE 3000

# Start in development mode
CMD ["npm", "start"]

# Stage 2: Build for Production
FROM node:20-alpine AS build

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev) for build
# Use npm install if no lock file exists, otherwise use npm ci
RUN if [ -f package-lock.json ]; then npm ci; else npm install && npm shrinkwrap; fi

# Copy source code and configuration files
COPY . .

# Build the application
RUN npm run build

# Stage 3: Production with Nginx
FROM nginx:alpine AS production

# Copy built files to nginx
COPY --from=build /usr/src/app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose production port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
