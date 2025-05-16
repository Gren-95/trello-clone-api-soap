#!/bin/bash

# Print with colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Trello SOAP API Tests${NC}"

# Check if node is installed
if ! command -v node &> /dev/null
then
    echo -e "${RED}Node.js is not installed. Please install Node.js to run the tests.${NC}"
    exit 1
fi

# Check if npm packages are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Make sure the SOAP server is running
echo "Checking if SOAP server is running..."
if ! curl -s http://localhost:3067 > /dev/null; then
    echo -e "${RED}SOAP server does not appear to be running. Please start it with 'npm start' in another terminal.${NC}"
    exit 1
fi

# Run the tests
echo "Running tests..."
node tests/test.js

# Check the exit code
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Tests failed!${NC}"
    exit 1
fi 