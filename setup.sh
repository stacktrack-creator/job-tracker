#!/bin/bash
# Job Tracker — one-time setup script
set -e

echo "🚀 Setting up Job Tracker..."
echo ""

# 1. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 2. Generate Prisma client and push schema to SQLite
echo ""
echo "🗄️  Setting up database..."
npx prisma generate
npx prisma db push

echo ""
echo "✅ Setup complete!"
echo ""
echo "👉 Start the app with:  npm run dev"
echo "👉 Then open:           http://localhost:3000"
echo ""
echo "Optional — open Prisma Studio (DB browser): npm run db:studio"
