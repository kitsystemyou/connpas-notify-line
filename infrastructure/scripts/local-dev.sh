#!/bin/bash

# Local development setup script

set -e

echo "🏠 Setting up local development environment"

# Check if required tools are installed
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed. Aborting." >&2; exit 1; }

# Install dependencies
echo "📦 Installing dependencies..."
cd backend
npm install

# Set up environment variables
echo "🔧 Setting up environment variables..."
if [ ! -f ".env" ]; then
    cat > .env << EOF
NODE_ENV=development
GOOGLE_CLOUD_PROJECT=your-project-id
FUNCTION_REGION=asia-northeast1
LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-access-token
PORT=8080
EOF
    echo "📝 Created .env file. Please update with your actual values."
fi

# Create local test data
echo "🧪 Creating local test data..."
mkdir -p test-data
cat > test-data/sample-user.json << EOF
{
  "connpassId": "test-user",
  "lineUserId": "test-line-user",
  "reminderSettings": {
    "enabled": true,
    "timings": [
      { "value": 1, "unit": "days" },
      { "value": 3, "unit": "hours" }
    ],
    "eventTypes": []
  }
}
EOF

cat > test-data/sample-event.json << EOF
{
  "id": 12345,
  "title": "Test Event",
  "description": "This is a test event",
  "startDate": "2024-01-15T19:00:00+09:00",
  "endDate": "2024-01-15T21:00:00+09:00",
  "location": "オンライン",
  "eventUrl": "https://test.connpass.com/event/12345/",
  "ownerNickname": "test-owner",
  "limit": 50,
  "accepted": 25,
  "waiting": 0,
  "tags": ["JavaScript", "Node.js"]
}
EOF

echo "📋 Local development setup complete!"
echo ""
echo "🚀 To start development:"
echo "  1. Update .env file with your actual values"
echo "  2. Run: npm run dev"
echo "  3. Test with: curl http://localhost:8080?action=health"
echo ""
echo "🔧 Available commands:"
echo "  - npm run dev: Start development server"
echo "  - npm run build: Build TypeScript"
echo "  - npm run test: Run tests"
echo ""
echo "📚 Test endpoints:"
echo "  - GET /?action=health: Health check"
echo "  - GET /?action=test: Test Connpass API"
echo "  - POST / with {\"type\":\"scheduled\"}: Test reminder processing"