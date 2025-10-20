#!/bin/bash
set -e

echo "🚀 Starting AI Tutor Backend..."
echo "📊 Environment: ${ENV:-dev}"
echo "🔌 Port: ${PORT:-8000}"

# Verifica variabili d'ambiente critiche
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  WARNING: DATABASE_URL not set"
    if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_NAME" ]; then
        echo "❌ ERROR: Neither DATABASE_URL nor DB_HOST/DB_USER/DB_NAME are set"
        exit 1
    fi
fi

if [ -z "$SECRET_KEY" ]; then
    echo "⚠️  WARNING: SECRET_KEY not set - using default (INSECURE for production)"
fi

# Test database connection (optional, commenta se causa problemi)
# echo "🔍 Testing database connection..."
# python -c "from app.core.db import engine; engine.connect()" || echo "⚠️  Database connection test failed, continuing anyway..."

# Avvia l'applicazione
echo "✅ Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --log-level info

