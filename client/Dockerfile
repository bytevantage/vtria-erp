# Stage 1: Development
FROM node:20-alpine AS development

WORKDIR /usr/src/app

# Install development dependencies
COPY package*.json ./
RUN npm install

# Copy source code and public files
COPY public/ ./public/
COPY src/ ./src/
COPY .env* ./

# Expose development port
EXPOSE 3000

# Start in development mode
CMD ["npm", "start"]

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Use nginx to serve the static files
FROM nginx:alpine

# Copy built files to nginx
COPY --from=production /usr/src/app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose production port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
