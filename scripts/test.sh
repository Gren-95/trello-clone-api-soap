#!/bin/bash

# Go to project root
cd "$(dirname "$0")/.."

# Check if dependencies are installed
if [ ! -d node_modules ]; then
    echo "Installing dependencies..."
    npm install
fi

# Run the test script
echo "Running tests..."
node tests/test.js 