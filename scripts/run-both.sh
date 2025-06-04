#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting both SOAP and REST APIs for comparison testing${NC}"

# Check if node is installed
if ! command -v node &> /dev/null
then
    echo -e "${RED}Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Check if npm packages are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Check if .env file exists, create if not
if [ ! -f ".env" ]; then
    echo "Creating .env file with JWT secret..."
    echo "JWT_SECRET=$(openssl rand -base64 32)" > .env
fi

echo -e "${GREEN}Starting SOAP API (port 3067) and REST API (port 3066)...${NC}"

# Kill any existing processes on these ports
lsof -ti:3067 | xargs kill -9 2>/dev/null || true
lsof -ti:3066 | xargs kill -9 2>/dev/null || true

# Start both APIs in background
npm run start:both &

# Wait a moment for servers to start
sleep 3

# Check if both servers are running
if curl -s http://localhost:3067/soap/trello?wsdl > /dev/null && curl -s http://localhost:3066 > /dev/null; then
    echo -e "${GREEN}✓ Both APIs are running successfully!${NC}"
    echo -e "SOAP API: http://localhost:3067/soap/trello?wsdl"
    echo -e "REST API: http://localhost:3066"
    echo -e "REST API Docs (EN): http://localhost:3066/en"
    echo -e "REST API Docs (ET): http://localhost:3066/et"
    echo -e "\nPress Ctrl+C to stop both servers"
    
    # Wait for user to stop
    wait
else
    echo -e "${RED}✗ Failed to start one or both APIs${NC}"
    exit 1
fi 