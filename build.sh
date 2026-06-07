#!/bin/bash

# Exit on error
set -e

echo "Building Docker image 'journeys:latest'..."

# Run the docker build command
docker build -t journeys:latest .

echo "Build complete! You can run the container with:"
echo "docker run -p 3000:3000 journeys:latest"
