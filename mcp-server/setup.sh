#!/bin/bash

# Setup script para AutoRenta MCP Server

set -e

echo "╔════════════════════════════════════════╗"
echo "║   AutoRenta MCP Server Setup           ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ .env file created"
    echo ""
    echo "📝 Please edit .env and add your Supabase credentials:"
    echo "   - SUPABASE_ANON_KEY"
    echo "   - SUPABASE_SERVICE_ROLE_KEY (optional but recommended)"
    echo ""
    read -p "Press Enter after updating .env file..."
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Test connection
echo "🧪 Testing server startup..."
timeout 5 node dist/index.js 2>&1 | head -10 || true

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 To start the server in development mode:"
echo "   npm run dev"
echo ""
echo "🧪 To run the test client:"
echo "   npm test"
echo ""
echo "📚 Resources available:"
echo "   - autorenta://platform/status      - Platform statistics"
echo "   - autorenta://cars/available       - Available cars"
echo "   - autorenta://bookings/active      - Active bookings"
echo "   - autorenta://bookings/pending     - Pending approvals"
echo "   - autorenta://daily/summary        - Daily operations summary"
echo "   - autorenta://search/cars          - Search cars with filters"
echo "   - autorenta://car/details          - Detailed car information"
echo "   - autorenta://user/profile         - User profile details"
echo ""
echo "🔧 Tools available:"
echo "   - approve_booking          - Approve a pending booking"
echo "   - reject_booking           - Reject a booking"
echo "   - block_car_availability   - Block car availability"
echo "   - generate_revenue_report  - Generate revenue reports"
echo "   - find_user               - Search users"
echo "   - check_car_availability  - Check car availability"
echo "   - clear_cache             - Clear server cache"
echo ""
echo "💡 To use with Cursor/Claude:"
echo "   1. Restart Cursor to load the new MCP server"
echo "   2. Use '@autorenta-platform' to access resources"
echo "   3. Example: '@autorenta-platform show me pending bookings'"