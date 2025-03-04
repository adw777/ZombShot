#!/bin/bash

echo "Setting up development environment..."

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
cd server
pip install -r requirements.txt
cd ..

# Install Node.js dependencies
npm install

echo "Setup complete! You can now:"
echo "1. Start the backend server: cd server && ./start.sh"
echo "2. Start the frontend development server: npm run dev"
echo "3. Open http://localhost:3000 in your browser" 