#!/bin/bash

# TerraMap3D - Setup and Run Script

echo "🗺️  TerraMap3D - 2D Web Viewer Setup"
echo "===================================="
echo ""

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Check if services are already running
if docker-compose ps | grep -q "Up"; then
    echo "⚠️  Services are already running"
    echo ""
    read -p "Do you want to restart the services? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔄 Restarting services..."
        docker-compose down
        docker-compose up -d
    fi
else
    echo "🚀 Starting services..."
    docker-compose up -d
fi

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check if TiTiler is running
echo "🔍 Checking TiTiler..."
if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
    echo "✅ TiTiler is running at http://localhost:8000"
else
    echo "⚠️  TiTiler may still be starting up. Check with: docker-compose logs titiler"
fi

# Check if web app is running
echo "🔍 Checking web application..."
if curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo "✅ Web app is running at http://localhost:8080"
else
    echo "⚠️  Web app may still be starting up. Check with: docker-compose logs webapp"
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "📌 Access the application:"
echo "   Web App: http://localhost:8080"
echo "   TiTiler API Docs: http://localhost:8000/docs"
echo ""
echo "📝 Useful commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart services: docker-compose restart"
echo ""
