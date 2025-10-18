# 🚀 Guida al Deployment - AI Tutor Platform

## Panoramica
- **Frontend**: Vercel (già deployato ✅)
- **Backend**: Render.com
- **Database**: PostgreSQL su Render

---

## 📦 PARTE 1: Deploy Backend su Render

### Step 1: Prepara il Repository
1. Assicurati che tutto il codice sia su GitHub
2. Fai commit e push del codice:
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Step 2: Crea Account su Render
1. Vai su https://render.com
2. Registrati (puoi usare GitHub per login rapido)

### Step 3: Crea Database PostgreSQL
1. Dal Dashboard di Render, clicca **"New +"** → **"PostgreSQL"**
2. Configura:
   - **Name**: `ai-tutor-db`
   - **Database**: `aitutor`
   - **User**: `aitutor`
   - **Region**: Scegli la più vicina (es. Frankfurt)
   - **Plan**: **Free** (per iniziare)
3. Clicca **"Create Database"**
4. **IMPORTANTE**: Copia e salva l'**Internal Database URL** (serve dopo)

### Step 4: Deploy Backend
1. Dal Dashboard, clicca **"New +"** → **"Web Service"**
2. Connetti il tuo repository GitHub
3. Seleziona il repository del progetto
4. Configura:
   - **Name**: `ai-tutor-backend`
   - **Region**: Stessa del database (es. Frankfurt)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: **Python 3**
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: **Free** (per iniziare)

5. **Aggiungi Variabili d'Ambiente** (clicca su "Advanced" → "Add Environment Variable"):

```env
ENV=prod
SECRET_KEY=<genera-una-stringa-casuale-lunga-almeno-32-caratteri>
DATABASE_URL=<incolla-l-internal-database-url-copiato-prima>
FRONTEND_URL=https://ai-tutor-platform-iota.vercel.app
CORS_ORIGINS=https://ai-tutor-platform-iota.vercel.app,https://ai-tutor-platform-iota.vercel.app/
AGORA_APP_ID=4d3c5454d08847ed9536332dad1b6759
AGORA_APP_CERTIFICATE=5c6993d86ecc434682beb8873b3ae5c8
```

**Opzionali** (aggiungi se hai le chiavi):
```env
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

6. Clicca **"Create Web Service"**
7. Aspetta che il deploy finisca (3-5 minuti)
8. **Copia l'URL del backend** (sarà tipo: `https://ai-tutor-backend-xxx.onrender.com`)

### Step 5: Testa il Backend
Apri nel browser:
```
https://ai-tutor-backend-xxx.onrender.com/api/health
```
Dovresti vedere:
```json
{"status":"healthy","timestamp":"...","environment":"prod"}
```

✅ **Backend deployato con successo!**

---

## 🎨 PARTE 2: Configura Frontend su Vercel

### Step 1: Aggiungi Variabile d'Ambiente
1. Vai su https://vercel.com/dashboard
2. Seleziona il progetto `ai-tutor-platform-iota`
3. Vai in **Settings** → **Environment Variables**
4. Aggiungi:
   - **Name**: `VITE_API_BASE_URL`
   - **Value**: `https://ai-tutor-backend-xxx.onrender.com` (URL del tuo backend Render)
   - **Environments**: Seleziona **Production**, **Preview**, **Development**
5. Clicca **"Save"**

### Step 2: Redeploy Frontend
1. Vai nella tab **Deployments**
2. Trova l'ultimo deployment
3. Clicca sui tre puntini → **"Redeploy"**
4. Conferma
5. Aspetta il completamento (1-2 minuti)

✅ **Frontend configurato!**

---

## 🧪 PARTE 3: Test Completo

### Test 1: Backend
```bash
curl https://ai-tutor-backend-xxx.onrender.com/api/health
```

### Test 2: Frontend
1. Apri https://ai-tutor-platform-iota.vercel.app
2. Apri Console del Browser (F12)
3. Prova a creare un account
4. Verifica che NON ci siano errori di connessione

### Test 3: Registrazione
1. Compila il form di registrazione
2. Clicca "Crea Profilo"
3. Dovresti essere reindirizzato alla dashboard

---

## 🔧 Risoluzione Problemi

### Problema: "Backend not available"
- Verifica che il backend sia attivo su Render
- Controlla che `VITE_API_BASE_URL` sia configurato su Vercel
- Fai redeploy del frontend dopo aver aggiunto la variabile

### Problema: "Database connection failed"
- Verifica che `DATABASE_URL` sia corretto su Render
- Il formato deve essere: `postgresql://user:password@host:port/database`

### Problema: CORS errors
- Verifica che `CORS_ORIGINS` includa l'URL Vercel esatto
- Aggiungi sia con che senza trailing slash

### Problema: Backend va in sleep (Free Plan)
- Il piano Free di Render mette il servizio in sleep dopo 15 minuti di inattività
- Il primo caricamento dopo sleep può richiedere 30-60 secondi
- Soluzione: upgrade a piano Starter ($7/mese) per servizio sempre attivo

---

## 💡 Tips per Produzione

### Sicurezza
1. **Genera SECRET_KEY sicura**:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

2. **Usa variabili d'ambiente** per tutte le chiavi sensibili

### Performance
1. **Render Free Plan**: si riattiva dopo sleep (~30 sec)
2. **Considera Starter Plan** se serve sempre attivo
3. **Database**: Free plan ha limite di 1GB

### Monitoring
1. **Render Dashboard**: mostra logs in tempo reale
2. **Vercel Analytics**: monitora performance frontend
3. **Endpoint /api/health**: controlla stato backend

---

## 📞 Checklist Finale

- [ ] Backend deployato su Render e risponde su `/api/health`
- [ ] Database PostgreSQL creato e connesso
- [ ] Variabile `VITE_API_BASE_URL` configurata su Vercel
- [ ] Frontend redeployato dopo configurazione
- [ ] Test registrazione utente funzionante
- [ ] Test login funzionante
- [ ] Test accesso dashboard funzionante

---

## 🆘 Comandi Utili

### Generare SECRET_KEY
```bash
openssl rand -hex 32
```

### Testare API da terminale
```bash
# Test health
curl https://your-backend.onrender.com/api/health

# Test registrazione
curl -X POST https://your-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","role":"student","first_name":"Test","last_name":"User"}'
```

### Vedere logs Render
```bash
# Vai su Render Dashboard → tuo servizio → Logs
```

---

## 🎉 Congratulazioni!

Il tuo sistema è ora in produzione! 🚀

**URLs:**
- Frontend: https://ai-tutor-platform-iota.vercel.app
- Backend: https://your-backend.onrender.com
- API Docs: https://your-backend.onrender.com/docs (solo in dev mode)

