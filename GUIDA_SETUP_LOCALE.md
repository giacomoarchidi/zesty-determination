# 🚀 Guida Setup Locale - AI Tutoring Platform

Questa guida ti aiuterà a lanciare l'intera piattaforma sul tuo computer locale.

---

## 📋 Prerequisiti

Prima di iniziare, assicurati di avere installato:

- **Git** - [Download](https://git-scm.com/downloads)
- **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop/)
- **Python 3.11+** - [Download](https://www.python.org/downloads/)
- **Node.js 20+** - [Download](https://nodejs.org/)

---

## 🎯 Metodo Rapido: Docker Compose (CONSIGLIATO)

Questo è il metodo più semplice e veloce!

### 1️⃣ Clona il Repository

```bash
git clone https://github.com/giacomoarchidi/zesty-determination.git
cd zesty-determination
```

### 2️⃣ Configura le Variabili d'Ambiente

Crea il file di configurazione per il backend:

```bash
cd backend
```

Crea un file chiamato `.env.dev` con questo contenuto:

```env
# Database (già configurato con Docker Compose)
DATABASE_URL=postgresql://tp_user:tp_pass@db:5432/tp_db
DB_HOST=db
DB_PORT=5432
DB_NAME=tp_db
DB_USER=tp_user
DB_PASSWORD=tp_pass

# Redis
REDIS_URL=redis://redis:6379

# JWT Security
SECRET_KEY=dev-secret-key-change-in-production-12345678
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# CORS - Frontend URL
CORS_ORIGINS=http://localhost:5173
FRONTEND_URL=http://localhost:5173

# Environment
ENV=dev

# Email (opzionale per sviluppo locale)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tuo-email@gmail.com
SMTP_PASSWORD=tua-password
EMAIL_FROM=noreply@tutoring-platform.com

# Storage MinIO
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minio
MINIO_SECRET_KEY=minio_pass
MINIO_BUCKET=tutoring-platform
MINIO_SECURE=false

# Stripe (opzionale per sviluppo locale)
STRIPE_PUBLIC_KEY=pk_test_your_key
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# OpenAI (opzionale per sviluppo locale)
OPENAI_API_KEY=sk-your-openai-key

# Agora (video calls - opzionale)
AGORA_APP_ID=your_app_id
AGORA_APP_CERTIFICATE=your_certificate
```

> ⚠️ **Nota**: Per iniziare, puoi lasciare vuoti i campi opzionali (Stripe, OpenAI, Email). La piattaforma funzionerà comunque!

### 3️⃣ Avvia Tutti i Servizi con Docker

Torna alla root del progetto e lancia tutto:

```bash
cd ..
docker-compose -f ops/docker-compose.dev.yml up
```

Docker avvierà automaticamente:
- ✅ PostgreSQL (Database)
- ✅ Redis (Cache)
- ✅ MinIO (Storage)
- ✅ Backend FastAPI
- ✅ Celery Worker (Task asincroni)
- ✅ Celery Beat (Scheduler)
- ✅ Frontend React

**Attendi qualche minuto** per il primo avvio (Docker deve scaricare le immagini).

### 4️⃣ Accedi alla Piattaforma

Una volta che tutto è avviato, apri il browser:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8001
- **API Docs (Swagger)**: http://localhost:8001/docs
- **MinIO Console**: http://localhost:9001 (user: `minio`, pass: `minio_pass`)

### 5️⃣ Verifica che Funzioni

**Test Health Check**:
```bash
curl http://localhost:8001/api/health
```

Dovresti vedere:
```json
{"status":"healthy","timestamp":"...","environment":"dev"}
```

**Prova a Registrarti**:
1. Vai su http://localhost:5173/register
2. Compila il form di registrazione
3. Se funziona, sei pronto! 🎉

---

## 🔧 Comandi Utili Docker

### Vedere i Log
```bash
# Tutti i servizi
docker-compose -f ops/docker-compose.dev.yml logs -f

# Solo backend
docker-compose -f ops/docker-compose.dev.yml logs -f backend

# Solo frontend
docker-compose -f ops/docker-compose.dev.yml logs -f frontend
```

### Fermare i Servizi
```bash
docker-compose -f ops/docker-compose.dev.yml down
```

### Fermare e Rimuovere Tutto (inclusi i dati)
```bash
docker-compose -f ops/docker-compose.dev.yml down -v
```

### Riavviare un Singolo Servizio
```bash
# Riavvia solo il backend
docker-compose -f ops/docker-compose.dev.yml restart backend
```

### Ricostruire le Immagini (dopo modifiche al codice)
```bash
docker-compose -f ops/docker-compose.dev.yml up --build
```

---

## 🛠️ Metodo Manuale: Setup Senza Docker

Se preferisci più controllo o hai problemi con Docker, puoi fare il setup manuale.

### 1️⃣ Clona il Repository
```bash
git clone https://github.com/giacomoarchidi/zesty-determination.git
cd zesty-determination
```

### 2️⃣ Setup Database PostgreSQL

**Installazione PostgreSQL**:
- **Mac**: `brew install postgresql@16`
- **Ubuntu**: `sudo apt-get install postgresql-16`
- **Windows**: [Download Installer](https://www.postgresql.org/download/windows/)

**Crea Database**:
```bash
# Avvia PostgreSQL
# Mac: brew services start postgresql@16
# Ubuntu: sudo systemctl start postgresql

# Crea database e utente
psql postgres
CREATE USER tp_user WITH PASSWORD 'tp_pass';
CREATE DATABASE tp_db OWNER tp_user;
\q
```

### 3️⃣ Setup Redis

**Installazione**:
- **Mac**: `brew install redis`
- **Ubuntu**: `sudo apt-get install redis-server`
- **Windows**: [Download](https://redis.io/download)

**Avvia Redis**:
```bash
# Mac
brew services start redis

# Ubuntu
sudo systemctl start redis

# Windows
redis-server
```

### 4️⃣ Setup Backend

```bash
cd backend

# Crea virtual environment
python3 -m venv venv

# Attiva virtual environment
source venv/bin/activate  # Mac/Linux
# oppure
venv\Scripts\activate     # Windows

# Installa dipendenze
pip install -r requirements.txt

# Crea file .env.dev (modifica con i tuoi dati)
cat > .env.dev << EOF
DATABASE_URL=postgresql://tp_user:tp_pass@localhost:5432/tp_db
REDIS_URL=redis://localhost:6379
SECRET_KEY=dev-secret-key-change-in-production-12345678
CORS_ORIGINS=http://localhost:5173
FRONTEND_URL=http://localhost:5173
ENV=dev
EOF

# Esegui migrazioni database
alembic upgrade head

# Avvia backend
uvicorn app.main:app --reload --port 8000
```

Il backend sarà disponibile su http://localhost:8000

### 5️⃣ Setup Frontend (Nuovo Terminale)

```bash
cd frontend

# Installa dipendenze
npm install

# Crea file .env.local
echo "VITE_API_BASE_URL=http://localhost:8000" > .env.local

# Avvia frontend
npm run dev
```

Il frontend sarà disponibile su http://localhost:5173

### 6️⃣ Avvia Celery Worker (Opzionale, Nuovo Terminale)

Per i task asincroni (email, AI):

```bash
cd backend
source venv/bin/activate
celery -A app.core.celery_app worker -l info
```

---

## 📝 Creare Dati di Test

### Crea un Utente Admin

```bash
cd backend
source venv/bin/activate
python scripts/create_admin.py
```

### Crea Lezioni di Test

```bash
python create_test_lessons.py
```

---

## 🐛 Risoluzione Problemi

### ❌ Errore: "Database connection refused"

**Soluzione**:
```bash
# Verifica che PostgreSQL sia avviato
# Mac: brew services list
# Ubuntu: sudo systemctl status postgresql

# Verifica connessione
psql -U tp_user -d tp_db -h localhost
```

### ❌ Errore: "Redis connection refused"

**Soluzione**:
```bash
# Verifica che Redis sia avviato
redis-cli ping
# Dovrebbe rispondere: PONG
```

### ❌ Errore: "Port already in use"

**Soluzione**:
```bash
# Trova e termina il processo sulla porta
# Backend (8000/8001)
lsof -ti:8000 | xargs kill -9

# Frontend (5173)
lsof -ti:5173 | xargs kill -9
```

### ❌ Frontend non si connette al Backend

**Verifica**:
1. Il backend è avviato? → http://localhost:8000/api/health
2. Il file `.env.local` ha il valore corretto?
3. Hai fatto restart del frontend dopo aver modificato `.env.local`?

### ❌ Docker: "Cannot connect to Docker daemon"

**Soluzione**:
- Assicurati che Docker Desktop sia avviato
- Mac/Windows: Avvia l'applicazione Docker Desktop

---

## 🧪 Test

### Backend Tests
```bash
cd backend
source venv/bin/activate
pytest tests/ -v
```

### Frontend Tests
```bash
cd frontend
npm run test
```

---

## 📚 Struttura Progetto

```
zesty-determination/
├── backend/              # FastAPI Backend
│   ├── app/
│   │   ├── core/        # Config, DB, Security
│   │   ├── models/      # Database Models
│   │   ├── routers/     # API Endpoints
│   │   ├── schemas/     # Pydantic Schemas
│   │   └── services/    # Business Logic
│   ├── tests/           # Backend Tests
│   └── requirements.txt
├── frontend/            # React Frontend
│   ├── src/
│   │   ├── api/        # API Client
│   │   ├── components/ # React Components
│   │   ├── pages/      # Page Components
│   │   └── store/      # State Management
│   └── package.json
└── ops/                 # Docker Config
    └── docker-compose.dev.yml
```

---

## 🎓 Prossimi Passi

Una volta che la piattaforma è avviata:

1. **Esplora l'API**: http://localhost:8000/docs
2. **Registra un account**: Prova i diversi ruoli (studente, tutor, genitore)
3. **Sperimenta**: Modifica il codice e vedi i cambiamenti in tempo reale
4. **Leggi la documentazione**: Controlla gli altri file `.md` nel progetto

---

## 💬 Serve Aiuto?

Se hai problemi:
1. Controlla i log (Docker o console)
2. Verifica le variabili d'ambiente
3. Consulta i file di documentazione nel repo
4. Apri una issue su GitHub

---

## 🚀 Deployment in Produzione

Quando sei pronto per il deploy:
- **Backend**: Segui `RENDER_ENV.md`
- **Frontend**: Segui `VERCEL_ENV.md`
- **Guida completa**: `DEPLOYMENT_GUIDE.md`

---

**Buon coding! 🎉**

---

_Ultima modifica: Ottobre 2025_

