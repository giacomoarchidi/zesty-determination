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
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copia il codice dell'applicazione
COPY . /app

# Comando di default
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8001}"]