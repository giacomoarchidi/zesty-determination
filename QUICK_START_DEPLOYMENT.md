# 🚀 Guida Rapida al Deployment

Hai problemi a far comunicare il frontend (Vercel) con il backend (Render)?

Segui questa guida passo-passo per risolvere tutti i problemi! 👇

---

## 📋 Cosa abbiamo risolto

✅ **Fix password validation** - Ora la password viene validata correttamente (max 72 bytes per bcrypt)  
✅ **Guida CORS completa** - Configurazione corretta per far comunicare Vercel con Render  
✅ **Variabili d'ambiente** - Guide dettagliate per entrambe le piattaforme  
✅ **Troubleshooting** - Soluzioni per tutti gli errori comuni

---

## 🎯 Quick Start (3 passi)

### 1️⃣ Configura Backend (Render)

📄 **Guida completa**: [`RENDER_ENV.md`](./RENDER_ENV.md)

**Passi rapidi**:
1. Vai su [Render Dashboard](https://dashboard.render.com/)
2. Seleziona il tuo servizio backend
3. Vai su **Environment** → **Add Environment Variable**
4. Aggiungi queste variabili **obbligatorie**:

```env
ENV=prod
SECRET_KEY=<genera-chiave-random>
CORS_ORIGINS=https://tuo-frontend.vercel.app
FRONTEND_URL=https://tuo-frontend.vercel.app
```

> ⚠️ **IMPORTANTE**: Sostituisci `tuo-frontend.vercel.app` con il tuo vero URL di Vercel!

5. Fai **Deploy** (manuale o push a GitHub)

---

### 2️⃣ Configura Frontend (Vercel)

📄 **Guida completa**: [`VERCEL_ENV.md`](./VERCEL_ENV.md)

**Passi rapidi**:
1. Vai su [Vercel Dashboard](https://vercel.com/dashboard)
2. Seleziona il tuo progetto
3. Vai su **Settings** → **Environment Variables**
4. Aggiungi:

```env
Key: VITE_API_BASE_URL
Value: https://tuo-backend.onrender.com
```

> ⚠️ **IMPORTANTE**: NON aggiungere `/api` alla fine!

5. **Settings** → **General** → **Root Directory** = `frontend`
6. Fai **Redeploy**

---

### 3️⃣ Verifica che Funzioni

**Test 1 - Backend Health Check**:
```bash
curl https://tuo-backend.onrender.com/api/health
```

Dovresti vedere:
```json
{"status":"healthy","timestamp":"...","environment":"prod"}
```

**Test 2 - Frontend**:
1. Apri il tuo sito su Vercel
2. Vai sulla pagina di registrazione
3. Prova a registrarti con:
   - Email: `test@example.com`
   - Password: `test123` (max 20 caratteri!)
   - Compila gli altri campi
4. Se funziona: **✅ Tutto ok!**

---

## 📚 Guide Dettagliate

### Per Render (Backend)
- 📄 [`RENDER_ENV.md`](./RENDER_ENV.md) - Tutte le variabili d'ambiente per Render
- Include configurazione database, email, Stripe, OpenAI, ecc.

### Per Vercel (Frontend)
- 📄 [`VERCEL_ENV.md`](./VERCEL_ENV.md) - Setup completo Vercel
- Include build settings, troubleshooting, test

### Deployment Completo
- 📄 [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) - Guida master con tutto
- Include fix del codice, CORS, troubleshooting avanzato

---

## 🔧 Modifiche Apportate al Codice

### 1. Backend - Password Validation

**File modificato**: `backend/app/schemas/auth.py`

```python
@validator('password')
def validate_password(cls, v):
    if len(v) < 6:
        raise ValueError('Password must be at least 6 characters long')
    # bcrypt has a 72 byte limit
    if len(v.encode('utf-8')) > 72:
        raise ValueError('Password is too long (max 72 bytes)')
    return v
```

Questo previene l'errore `password cannot be longer than 72 bytes`.

### 2. Frontend - Vercel Configuration

**File aggiunto**: `frontend/vercel.json`

```json
{
  "rewrites": [
    {"source": "/(.*)", "destination": "/index.html"}
  ]
}
```

Questo gestisce correttamente il routing di React (SPA).

---

## 🐛 Problemi Comuni

### ❌ Errore: "CORS policy blocked"

**Causa**: Il backend non riconosce l'URL di Vercel

**Soluzione**:
1. Vai su Render → Environment
2. Aggiungi/Modifica `CORS_ORIGINS`
3. Valore: `https://tuo-frontend.vercel.app`
4. Redeploy

---

### ❌ Errore: "password cannot be longer than 72 bytes"

**Causa**: Password troppo lunga per bcrypt

**Soluzione**:
1. **Fix applicato**: Il codice ora valida automaticamente
2. Se ancora presente su Render, fai **push del codice aggiornato**
3. Nel frattempo, usa **password più corte** (max 20 caratteri)

---

### ❌ Errore: "Network Error" o "ERR_CONNECTION_REFUSED"

**Causa**: Frontend non trova il backend

**Soluzione**:
1. Verifica che il backend su Render sia **online**
2. Testa: `curl https://tuo-backend.onrender.com/api/health`
3. Controlla `VITE_API_BASE_URL` su Vercel
4. Deve essere: `https://tuo-backend.onrender.com` (senza `/api` alla fine)

---

### ❌ Errore 404 dopo refresh

**Causa**: Vercel non gestisce correttamente le route di React

**Soluzione**:
1. Assicurati che `frontend/vercel.json` esista (abbiamo appena creato)
2. Fai un redeploy su Vercel
3. Il file `vercel.json` deve essere nella cartella `frontend/`

---

### ❌ Build fallisce su Vercel

**Causa**: Impostazioni di build errate

**Soluzione**:
1. Vercel → Settings → General
2. **Framework Preset**: `Vite`
3. **Root Directory**: `frontend`
4. **Build Command**: `npm run build`
5. **Output Directory**: `dist`

---

### ❌ Build fallisce su Render

**Causa**: Dipendenze mancanti o Python version

**Soluzione**:
1. Render → Settings
2. **Build Command**: `pip install -r requirements.txt`
3. **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. **Python Version**: `3.11` o superiore

---

## ✅ Checklist Completa

### Backend (Render)
- [ ] Variabile `ENV=prod` configurata
- [ ] Variabile `SECRET_KEY` configurata (random, sicura)
- [ ] Variabile `CORS_ORIGINS` include l'URL di Vercel
- [ ] Variabile `FRONTEND_URL` configurata
- [ ] Database PostgreSQL collegato
- [ ] Deploy completato con successo
- [ ] `/api/health` risponde con `{"status":"healthy"}`

### Frontend (Vercel)
- [ ] Variabile `VITE_API_BASE_URL` configurata
- [ ] Root Directory impostato su `frontend`
- [ ] Framework Preset impostato su `Vite`
- [ ] File `vercel.json` presente in `frontend/`
- [ ] Deploy completato con successo
- [ ] Il sito è accessibile e carica

### Test End-to-End
- [ ] Registrazione funziona
- [ ] Login funziona
- [ ] Dashboard carica correttamente
- [ ] Nessun errore CORS nella console

---

## 📞 Ancora Problemi?

1. **Controlla i log**:
   - Render: Dashboard → Service → Logs
   - Vercel: Dashboard → Deployments → Function Logs
   - Browser: F12 → Console + Network tabs

2. **Confronta la configurazione** con le guide

3. **Verifica le variabili** d'ambiente (typo, spazi extra, ecc.)

4. **Test isolati**:
   - Backend da solo: `curl https://tuo-backend.onrender.com/api/health`
   - Frontend da solo: verifica che carichi la UI
   - Poi testa l'integrazione

---

## 🎓 Risorse

- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [FastAPI CORS Guide](https://fastapi.tiangolo.com/tutorial/cors/)
- [Vite Env Variables](https://vitejs.dev/guide/env-and-mode.html)

---

**Creato**: 17 Ottobre 2025  
**Ultima modifica**: 17 Ottobre 2025

---

💡 **Tip**: Salva questa guida nei preferiti! Ti servirà ogni volta che dovrai debuggare il deployment.

