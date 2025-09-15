#!/bin/bash

# Exit on any error
set -e

# Load environment variables
if [ "$ENVIRONMENT" = "production" ]; then
    echo "Loading production environment..."
    export $(cat .env.production | grep -v '^#' | xargs)
else
    echo "Loading development environment..."
    export $(cat .env.development | grep -v '^#' | xargs)
fi

# Build and start containers
echo "Building and starting containers..."
docker-compose -f docker-compose.yml build
docker-compose -f docker-compose.yml up -d

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 10

# Run database migrations
echo "Running database migrations..."
docker-compose exec api npm run migrate

# Run tests if in development environment
if [ "$ENVIRONMENT" != "production" ]; then
    echo "Running tests..."
    docker-compose exec api npm test
fi

# Health check
echo "Performing health check..."
curl -f http://localhost:5000/health || exit 1

echo "Deployment completed successfully!"
