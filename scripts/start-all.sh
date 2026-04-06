#!/bin/bash

echo "======================================"
echo "Starting D-CARPOOL Application"
echo "======================================"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down all services..."
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Start Hardhat node
echo "Starting Hardhat node..."
cd contracts
npx hardhat node &
HARDHAT_PID=$!
cd ..
sleep 5

# Start backend server
echo "Starting backend server..."
cd server
npm run dev &
SERVER_PID=$!
cd ..
sleep 3

# Start frontend
echo "Starting frontend..."
cd client
npm start &
CLIENT_PID=$!
cd ..

echo ""
echo "======================================"
echo "All services started!"
echo "======================================"
echo ""
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:5001"
echo "Blockchain: http://127.0.0.1:8545"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for all background processes
wait
