#!/bin/bash

# Print with colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Trello SOAP API Server${NC}"

# Check if node is installed
if ! command -v node &> /dev/null
then
    echo -e "${RED}Node.js is not installed. Please install Node.js to run the server.${NC}"
    exit 1
fi

# Check if npm packages are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Check if .env file exists, create it if not
if [ ! -f ".env" ]; then
    echo "Creating .env file with JWT secret..."
    echo "JWT_SECRET=your_jwt_secret_key_for_trello_clone_soap_api" > .env
fi

# Start the server
echo -e "${BLUE}Starting SOAP server on port 3067...${NC}"
echo "WSDL will be available at: http://localhost:3067/soap/trello?wsdl"
echo -e "${BLUE}Press Ctrl+C to stop the server${NC}"

# Run the server
node src/soap/soap-server.js 