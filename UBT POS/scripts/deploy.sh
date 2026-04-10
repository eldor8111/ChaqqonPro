#!/bin/bash
# ChaqqonPro Deployment Script
set -e

echo "🚀 Boshlanmoqda..."
echo "1. Kodni Githubdan olish..."
git pull origin main

echo "2. Paketalarni yuklash va Prisma ulash..."
npm ci
npx prisma generate
npx prisma migrate deploy

echo "3. Tizimni qayta qurish (Build)..."
npm run build

echo "4. Serverni qayta ishga tushirish..."
# Agar PM2 bo'lsa:
# pm2 reload chaqqonpro-app || pm2 start ecosystem.config.js
# Agar Docker bo'lsa:
docker-compose down
docker-compose up -d --build

echo "✅ Deployment MUVAFFAQIYATLI yakunlandi! Tizim endi eng yengi versiyada ishlamoqda."
