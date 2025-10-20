FROM python:3.11-slim

# dipendenze di sistema per WeasyPrint (opzionale)
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    gcc \
    libpq-dev \
    libpango-1.0-0 \
    libharfbuzz0b \
    libpangoft2-1.0-0 \
    libffi-dev \
    libcairo2 \
    libpixman-1-0 \
    libgdk-pixbuf-2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia requirements e installa dipendenze
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copia il codice dell'applicazione
COPY . .

# Rendi eseguibile lo script di avvio
RUN chmod +x start.sh

# Esponi la porta (Railway usa la variabile $PORT)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/api/health || exit 1

# Comando di default
CMD ["./start.sh"]