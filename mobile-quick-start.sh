#!/bin/bash

# 📱 AUTORENTA MOBILE - Quick Start Script

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  📱 AUTORENTA MOBILE APP - QUICK START                  ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Check if we're in the correct directory
if [ ! -f "capacitor.config.js" ]; then
    echo "❌ Error: Please run this script from the autorenta root directory"
    exit 1
fi

# Show menu
echo "Select an option:"
echo ""
echo "1. 🌐 Start Web Development Server (localhost:4200)"
echo "2. 📱 Open Android Studio"
echo "3. 🔨 Build for Android (Debug APK)"
echo "4. 🔄 Sync Capacitor (after code changes)"
echo "5. 🏗️  Full rebuild (clean + build + sync)"
echo "6. 📊 Show project status"
echo ""
read -p "Enter option (1-6): " option

case $option in
    1)
        echo ""
        echo "🌐 Starting development server..."
        echo "   URL: http://localhost:4200/tabs/home"
        echo ""
        cd apps/web && npm start
        ;;
    2)
        echo ""
        echo "📱 Opening Android Studio..."
        npx cap open android
        ;;
    3)
        echo ""
        echo "🔨 Building Android APK..."
        cd android && ./gradlew assembleDebug
        echo ""
        echo "✅ APK created at:"
        echo "   android/app/build/outputs/apk/debug/app-debug.apk"
        ;;
    4)
        echo ""
        echo "🔄 Syncing Capacitor..."
        npx cap sync
        echo ""
        echo "✅ Sync complete!"
        ;;
    5)
        echo ""
        echo "🏗️  Full rebuild starting..."
        echo ""
        echo "Step 1/3: Building web app..."
        cd apps/web && npm run build
        echo ""
        echo "Step 2/3: Syncing Capacitor..."
        cd ../.. && npx cap sync
        echo ""
        echo "Step 3/3: Copying assets..."
        npx cap copy
        echo ""
        echo "✅ Full rebuild complete!"
        ;;
    6)
        echo ""
        echo "📊 PROJECT STATUS"
        echo "════════════════════════════════════════════════════════"
        echo ""
        echo "📱 Platforms:"
        if [ -d "android" ]; then
            echo "   ✅ Android"
        else
            echo "   ❌ Android (run: npx cap add android)"
        fi
        if [ -d "ios" ]; then
            echo "   ✅ iOS"
        else
            echo "   ⚠️  iOS (requires macOS)"
        fi
        echo ""
        echo "🔌 Capacitor Plugins:"
        npx cap ls
        echo ""
        echo "📦 Build Output:"
        if [ -d "apps/web/dist/web/browser" ]; then
            echo "   ✅ Web build exists"
            du -sh apps/web/dist/web/browser
        else
            echo "   ❌ No build found (run: cd apps/web && npm run build)"
        fi
        echo ""
        echo "📱 Tab Bar Pages:"
        echo "   ✅ /tabs/home     → Home (new)"
        echo "   ✅ /tabs/explore  → Explore with map (new)"
        echo "   ✅ /tabs/publish  → Publish cars"
        echo "   ✅ /tabs/bookings → My bookings"
        echo "   ✅ /tabs/profile  → Profile"
        ;;
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac
