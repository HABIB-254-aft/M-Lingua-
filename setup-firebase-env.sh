#!/bin/bash
# Firebase Environment Setup Script
# This script helps you create the .env.local file

echo "🔥 Firebase Environment Setup for M-Lingua"
echo "=========================================="
echo ""
echo "This script will help you create the .env.local file with your Firebase configuration."
echo ""
echo "You need to get these values from Firebase Console:"
echo "1. Go to: https://console.firebase.google.com/"
echo "2. Select your project"
echo "3. Click the gear icon > Project Settings"
echo "4. Scroll to 'Your apps' > Web app"
echo "5. Copy the config values"
echo ""
echo "Press Enter when you have your Firebase config values ready..."
read

echo ""
echo "Enter your Firebase configuration values:"
echo ""

read -p "API Key: " API_KEY
read -p "Auth Domain: " AUTH_DOMAIN
read -p "Project ID: " PROJECT_ID
read -p "Storage Bucket: " STORAGE_BUCKET
read -p "Messaging Sender ID: " MESSAGING_SENDER_ID
read -p "App ID: " APP_ID
read -p "Measurement ID (optional, press Enter to skip): " MEASUREMENT_ID

# Create .env.local file
cat > .env.local << EOF
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=$API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=$PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=$APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$MEASUREMENT_ID
EOF

echo ""
echo "✅ .env.local file created successfully!"
echo ""
echo "Next steps:"
echo "1. Restart your dev server: npm run dev"
echo "2. Test Firebase connection by trying to sign up"
echo ""

