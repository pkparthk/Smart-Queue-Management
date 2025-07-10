#!/bin/bash

# GitHub Student Pack Deployment Setup Script
echo "🎓 GitHub Student Pack Deployment Setup"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}📝 Initializing Git repository...${NC}"
    git init
    git add .
    git commit -m "Initial commit for GitHub Student Pack deployment"
    echo -e "${GREEN}✅ Git repository initialized${NC}"
else
    echo -e "${GREEN}✅ Git repository found${NC}"
fi

# Check if remote origin exists
if ! git remote get-url origin > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  No remote origin found${NC}"
    echo -e "${BLUE}💡 Please add your GitHub repository:${NC}"
    echo "   git remote add origin https://github.com/yourusername/smart-queue-management.git"
    echo "   git push -u origin main"
else
    echo -e "${GREEN}✅ Git remote origin configured${NC}"
fi

# Check for MongoDB connection
if grep -q "mongodb+srv://" .env 2>/dev/null; then
    echo -e "${GREEN}✅ MongoDB Atlas connection string found${NC}"
else
    echo -e "${RED}❌ MongoDB Atlas connection string not found in .env${NC}"
    echo -e "${YELLOW}Please ensure MONGODB_URI is set in your .env file${NC}"
fi

# Check Dockerfiles
if [ -f "backend/Dockerfile" ]; then
    echo -e "${GREEN}✅ Backend Dockerfile found${NC}"
else
    echo -e "${RED}❌ Backend Dockerfile missing${NC}"
fi

if [ -f "frontend/Dockerfile" ]; then
    echo -e "${GREEN}✅ Frontend Dockerfile found${NC}"
else
    echo -e "${RED}❌ Frontend Dockerfile missing${NC}"
fi

echo ""
echo -e "${BLUE}🚀 Next Steps for GitHub Student Pack Deployment:${NC}"
echo ""
echo -e "${YELLOW}1. Push to GitHub:${NC}"
echo "   git add ."
echo "   git commit -m 'Ready for Student Pack deployment'"
echo "   git push origin main"
echo ""
echo -e "${YELLOW}2. Deploy Backend (Render):${NC}"
echo "   📍 https://render.com"
echo "   🔧 New Web Service → Docker"
echo "   📁 Root Directory: backend"
echo "   🌐 Add environment variables from .env"
echo ""
echo -e "${YELLOW}3. Deploy Frontend (Vercel):${NC}"
echo "   📍 https://vercel.com"
echo "   🔧 New Project → Import repository"
echo "   📁 Root Directory: frontend"
echo "   🌐 Add NEXT_PUBLIC_* environment variables"
echo ""
echo -e "${YELLOW}4. Update CORS URLs:${NC}"
echo "   🔄 Update FRONTEND_URL in Render with Vercel URL"
echo "   🔄 Update API URLs in Vercel with Render URL"
echo ""
echo -e "${GREEN}📖 For detailed instructions, see DEPLOYMENT-STUDENT-PACK.md${NC}"
echo ""
echo -e "${BLUE}🎓 Don't forget to apply your GitHub Student Pack benefits!${NC}"
