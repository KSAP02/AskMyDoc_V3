#!/bin/bash

# Set container and image names
NETWORK_NAME="askmydoc-network"
BACKEND_IMAGE="askmydoc-backend"
FRONTEND_IMAGE="askmydoc"
BACKEND_CONTAINER="askmydoc-backend"
FRONTEND_CONTAINER="askmydoc-frontend"

# Create Docker network if it doesn't exist
if ! docker network ls | grep -q "$NETWORK_NAME"; then
  echo "Creating network: $NETWORK_NAME"
  docker network create "$NETWORK_NAME"
else
  echo "Network '$NETWORK_NAME' already exists"
fi

# Stop and remove any existing containers with the same name
docker rm -f "$BACKEND_CONTAINER" "$FRONTEND_CONTAINER" 2>/dev/null || true

# Run backend container
echo "Starting backend container..."
docker run -d \
  --name "$BACKEND_CONTAINER" \
  --env-file .env \
  --network "$NETWORK_NAME" \
  -p 8000:8000 \
  "$BACKEND_IMAGE"

# Run frontend container
echo "Starting frontend container..."
docker run -d \
  --name "$FRONTEND_CONTAINER" \
  --network "$NETWORK_NAME" \
  -e BACKEND_URL=http://$BACKEND_CONTAINER:8000 \
  -p 3000:3000 \
  "$FRONTEND_IMAGE"

