#!/bin/bash
echo "🛡 Updating GISA Safety Shield..."
cd ~/Desktop/gisa-clara
git pull origin main
docker compose -f docker-compose.simple.yml up -d --build api
echo "✅ GISA updated successfully!"
