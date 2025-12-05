#!/bin/bash
# P2P Automation Install Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "========================================"
echo "P2P Automation - Installation"
echo "========================================"

# Check if running as correct user
if [ "$USER" != "edu" ]; then
    echo "Warning: Running as $USER instead of edu"
fi

cd "$PROJECT_DIR"

# 1. Install dependencies
echo ""
echo "[1/5] Installing dependencies..."
npm install

# 2. Install Playwright browsers
echo ""
echo "[2/5] Installing Playwright browsers..."
npx playwright install chromium

# 3. Build TypeScript
echo ""
echo "[3/5] Building TypeScript..."
npm run build

# 4. Setup environment
if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo ""
    echo "[4/5] Creating .env file..."
    cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
    echo "Please edit .env with your credentials!"
else
    echo ""
    echo "[4/5] .env file already exists"
fi

# 5. Install systemd services (requires sudo)
echo ""
echo "[5/5] Installing systemd services..."
echo "This requires sudo access."

if [ -w /etc/systemd/system ]; then
    sudo cp "$PROJECT_DIR/systemd/p2p-detector.service" /etc/systemd/system/
    sudo cp "$PROJECT_DIR/systemd/p2p-executor.service" /etc/systemd/system/
    sudo systemctl daemon-reload
    echo "Services installed!"
else
    echo "Run these commands manually with sudo:"
    echo "  sudo cp $PROJECT_DIR/systemd/p2p-detector.service /etc/systemd/system/"
    echo "  sudo cp $PROJECT_DIR/systemd/p2p-executor.service /etc/systemd/system/"
    echo "  sudo systemctl daemon-reload"
fi

echo ""
echo "========================================"
echo "Installation Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Edit .env with your Supabase credentials"
echo "2. Run the database migration in Supabase"
echo "3. Start services:"
echo "   systemctl start p2p-detector"
echo "   systemctl start p2p-executor"
echo ""
echo "Or run manually:"
echo "   npm run dev -- detector"
echo "   npm run dev -- executor"
echo ""
