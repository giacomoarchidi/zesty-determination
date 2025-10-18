# 🚀 Guida al Deployment - Vercel + Render

## Problema Attuale

Il tuo frontend su Vercel non riesce a comunicare correttamente con il backend su Render. Ci sono due problemi principali:

1. **Errore 500 sul backend**: La password è troppo lunga per bcrypt
2. **Configurazione CORS**: Potrebbero esserci problemi di CORS tra Vercel e Render

---

## 📋 Checklist Pre-Deployment

### Backend su Render

#### 1. Variabili d'Ambiente su Render

Vai su Render Dashboard → Tuo servizio backend → Environment

Aggiungi/Verifica queste variabili:

```env
# Environment
ENV=prod

# Database (Render lo fornisce automaticamente)
DATABASE_URL=postgresql://... (fornito da Render)

# Security
SECRET_KEY=<genera-una-chiave-sicura-random>
JWT_ALGO=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# CORS - IMPORTANTE!
CORS_ORIGINS=https://tuo-frontend.vercel.app,https://tuo-frontend-preview.vercel.app

# Frontend URL
FRONTEND_URL=https://tuo-frontend.vercel.app

# Agora (per videochiamate)
AGORA_APP_ID=4d3c5454d08847ed9536332dad1b6759
AGORA_APP_CERTIFICATE=5c6993d86ecc434682beb8873b3ae5c8

# Opzionali (se non li hai, lasciali vuoti per ora)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
OPENAI_API_KEY=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=noreply@aitutor.com
```

**NOTA IMPORTANTE**: Sostituisci `https://tuo-frontend.vercel.app` con il tuo vero URL di Vercel!

#### 2. Build Command su Render

```bash
pip install -r requirements.txt
```

#### 3. Start Command su Render

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

---

### Frontend su Vercel

#### 1. Variabili d'Ambiente su Vercel

Vai su Vercel Dashboard → Tuo progetto → Settings → Environment Variables

Aggiungi:

```env
VITE_API_BASE_URL=https://tuo-backend.onrender.com
```

**NOTA**: Sostituisci con il tuo vero URL di Render (es: `https://ai-tutor-backend-kwfl.onrender.com`)

#### 2. Build Settings su Vercel

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

#### 3. Vercel.json (Opzionale ma consigliato)

Crea un file `vercel.json` nella cartella `frontend/`:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

---

## 🔧 Fix Immediati da Applicare

### 1. Fix Password Validation (Backend)

Il problema è che bcrypt accetta max 72 bytes. Aggiungiamo una validazione nello schema Pydantic.

Modifica `backend/app/schemas/auth.py`:

```python
from pydantic import BaseModel, EmailStr, field_validator
# ... altri import ...

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    # ... altri campi ...
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError('La password deve essere almeno 6 caratteri')
        if len(v.encode('utf-8')) > 72:
            raise ValueError('La password è troppo lunga (max 72 bytes)')
        return v
```

### 2. Fix CORS (Backend)

Il file `backend/app/main.py` è già configurato correttamente, ma assicurati che:

1. La variabile `CORS_ORIGINS` su Render contenga il tuo URL Vercel
2. Se usi un dominio custom, includilo anche

Esempio di `CORS_ORIGINS` su Render:
```
https://ai-tutor.vercel.app,https://ai-tutor-*.vercel.app,https://tuo-dominio-custom.com
```

Il `*` permette anche i deployment preview di Vercel.

### 3. Aggiorna URL API (Frontend)

Se il tuo file `.env.local` o le variabili su Vercel puntano ancora a localhost, aggiornale:

```env
VITE_API_BASE_URL=https://ai-tutor-backend-kwfl.onrender.com
```

---

## 🚀 Procedura di Deployment

### Passo 1: Deploy Backend su Render

1. **Aggiorna le variabili d'ambiente** su Render (specialmente `CORS_ORIGINS`)
2. **Fai commit delle modifiche** al codice (incluso il fix della password)
3. **Push su GitHub** (se hai collegato Render a GitHub)
4. Render farà il **deploy automatico**
5. Aspetta che il deploy sia completo
6. **Testa il backend**: vai su `https://tuo-backend.onrender.com/docs`

### Passo 2: Deploy Frontend su Vercel

1. **Aggiorna `VITE_API_BASE_URL`** nelle variabili d'ambiente di Vercel
2. **Fai commit delle modifiche** (se hai aggiunto `vercel.json`)
3. **Push su GitHub** (se hai collegato Vercel a GitHub) oppure usa `vercel --prod`
4. Vercel farà il **deploy automatico**
5. **Testa il frontend**: apri il sito su Vercel

### Passo 3: Test End-to-End

1. Apri il frontend su Vercel
2. Prova a registrarti con:
   - Email valida
   - **Password corta** (max 20 caratteri per sicurezza)
   - Tutti i campi richiesti
3. Controlla la console del browser (F12) per eventuali errori
4. Controlla i log su Render per il backend

---

## 🐛 Troubleshooting

### Errore: "CORS policy: No 'Access-Control-Allow-Origin'"

**Soluzione:**
1. Verifica che `CORS_ORIGINS` su Render contenga l'URL esatto di Vercel
2. Controlla che non ci siano spazi extra nella variabile
3. Riavvia il servizio su Render dopo aver modificato le variabili

### Errore: "Request failed with status code 500"

**Soluzione:**
1. Controlla i **log su Render** per vedere l'errore specifico
2. Verifica che tutte le **variabili d'ambiente** siano configurate
3. Assicurati che il **database PostgreSQL** sia connesso

### Errore: "password cannot be longer than 72 bytes"

**Soluzione:**
1. Applica il fix della validazione Pydantic (vedi sopra)
2. Fai deploy del backend aggiornato
3. Nel frattempo, usa **password più corte** (max 20 caratteri)

### Frontend non trova il backend

**Soluzione:**
1. Verifica che `VITE_API_BASE_URL` sia configurato correttamente su Vercel
2. Controlla che il backend su Render sia **attivo e raggiungibile**
3. Testa il backend direttamente: `curl https://tuo-backend.onrender.com/api/health`

### Deploy fallisce su Render

**Soluzione:**
1. Verifica che `requirements.txt` sia presente e corretto
2. Controlla i log di build su Render
3. Assicurati che Python 3.11+ sia selezionato

### Deploy fallisce su Vercel

**Soluzione:**
1. Verifica che `package.json` abbia lo script `build`
2. Controlla i log di build su Vercel
3. Assicurati che Node.js 18+ sia selezionato

---

## 📊 Verifica Deployment

### Backend Health Check

```bash
curl https://tuo-backend.onrender.com/api/health
```

Risposta attesa:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-17T...",
  "environment": "prod"
}
```

### Frontend Test

1. Apri il browser su `https://tuo-frontend.vercel.app`
2. Apri DevTools (F12) → Tab Network
3. Prova a registrarti
4. Dovresti vedere una chiamata a `https://tuo-backend.onrender.com/api/auth/register`
5. Se restituisce 200/201, funziona! ✅

---

## 🎯 Checklist Finale

- [ ] Variabili d'ambiente configurate su Render
- [ ] `CORS_ORIGINS` include l'URL di Vercel
- [ ] Backend deployato e raggiungibile su Render
- [ ] Variabile `VITE_API_BASE_URL` configurata su Vercel
- [ ] Frontend deployato su Vercel
- [ ] Health check del backend funziona
- [ ] Registrazione funziona end-to-end
- [ ] Login funziona end-to-end

---

## 📞 Supporto

Se hai ancora problemi:

1. **Controlla i log su Render**: Dashboard → Service → Logs
2. **Controlla i log su Vercel**: Dashboard → Project → Deployments → View Function Logs
3. **Console del browser**: F12 → Console e Network tabs
4. Condividi gli errori specifici per ricevere aiuto mirato

---

**Ultimo aggiornamento**: 17 Ottobre 2025

