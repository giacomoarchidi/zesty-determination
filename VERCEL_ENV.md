# 🚀 Variabili d'Ambiente per Vercel

Configurazione delle variabili d'ambiente per il frontend su Vercel.

## Come configurare su Vercel

1. Vai su [Vercel Dashboard](https://vercel.com/dashboard)
2. Seleziona il tuo progetto
3. Vai su **Settings** → **Environment Variables**
4. Aggiungi le variabili qui sotto
5. **Importante**: Riavvia il deployment dopo aver aggiunto le variabili

---

## ⚙️ Variabile Obbligatoria

### VITE_API_BASE_URL

Questa è l'unica variabile obbligatoria per il frontend.

**Key**: `VITE_API_BASE_URL`

**Value**: `https://tuo-backend.onrender.com`

> **IMPORTANTE**: 
> - Sostituisci `tuo-backend` con il tuo vero URL di Render
> - **NON** aggiungere `/api` alla fine
> - **NON** aggiungere `/` alla fine
> - Deve iniziare con `https://`

**Esempio corretto**:
```
VITE_API_BASE_URL=https://ai-tutor-backend-kwfl.onrender.com
```

**Esempi sbagliati**:
```
❌ VITE_API_BASE_URL=https://ai-tutor-backend-kwfl.onrender.com/
❌ VITE_API_BASE_URL=https://ai-tutor-backend-kwfl.onrender.com/api
❌ VITE_API_BASE_URL=http://ai-tutor-backend-kwfl.onrender.com (http invece di https)
```

---

## 🔧 Impostazioni di Build

Assicurati che le impostazioni di build siano configurate correttamente:

### Framework Preset
- **Seleziona**: `Vite`

### Build & Development Settings

**Build Command**:
```
npm run build
```

**Output Directory**:
```
dist
```

**Install Command**:
```
npm install
```

**Development Command**:
```
npm run dev
```

---

## 📁 Struttura del Progetto

Vercel deve deployare dalla cartella `frontend/`. Ci sono due modi per farlo:

### Opzione 1: Root Directory Settings

1. Vai su **Settings** → **General**
2. Trova **Root Directory**
3. Imposta su: `frontend`
4. Clicca **Save**

### Opzione 2: Deploy dalla cartella frontend

Quando colleghi il repository a Vercel, nella configurazione iniziale:
- **Root Directory**: `frontend`

---

## 🌍 Environment per Deployment

Quando aggiungi le variabili d'ambiente, assicurati di selezionare tutti gli ambienti:

- ✅ **Production** - Il sito live principale
- ✅ **Preview** - Branch preview deployments
- ✅ **Development** - Per `vercel dev` locale

In questo modo la variabile sarà disponibile in tutti gli ambienti.

---

## 🔄 Dopo aver configurato

1. **Redeploy** il progetto:
   - Vai su **Deployments**
   - Trova il deployment più recente
   - Clicca sul menu `⋯` → **Redeploy**
   - Oppure fai un nuovo commit e push

2. **Verifica** che funzioni:
   - Apri il sito su Vercel
   - Apri DevTools (F12) → Console
   - Prova a registrarti
   - Controlla che non ci siano errori di CORS

---

## ✅ Checklist di Verifica

Prima di considerare il deployment completo:

- [ ] `VITE_API_BASE_URL` è configurato con l'URL corretto di Render
- [ ] L'URL **non** finisce con `/` o `/api`
- [ ] L'URL usa `https://` (non `http://`)
- [ ] Framework Preset è impostato su `Vite`
- [ ] Root Directory è impostato su `frontend`
- [ ] Il backend su Render è **attivo e raggiungibile**
- [ ] `CORS_ORIGINS` su Render include l'URL di Vercel
- [ ] Hai fatto un redeploy dopo aver aggiunto le variabili

---

## 🧪 Test del Deployment

### 1. Test Backend Connection

Apri la console del browser (F12) sul tuo sito Vercel ed esegui:

```javascript
fetch('https://tuo-backend.onrender.com/api/health')
  .then(r => r.json())
  .then(console.log)
```

Dovresti vedere:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "environment": "prod"
}
```

### 2. Test Registration

1. Vai sulla pagina di registrazione
2. Compila il form con dati validi
3. Apri DevTools → Network tab
4. Clicca su Register
5. Dovresti vedere una chiamata a `/api/auth/register`
6. Status code dovrebbe essere `200` o `201`

### 3. Test CORS

Se vedi errori tipo:
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

Significa che devi aggiungere l'URL di Vercel a `CORS_ORIGINS` su Render.

---

## 🐛 Troubleshooting

### Build fallisce

**Errore**: `Module not found` o `Cannot find module`

**Soluzione**:
1. Verifica che `package.json` sia nella cartella `frontend/`
2. Controlla che tutte le dipendenze siano in `package.json`
3. Prova a fare `npm install` localmente per verificare

---

### Pagine non carican dopo il refresh

**Errore**: 404 quando refreshi una pagina diversa dalla home

**Soluzione**:
1. Assicurati che `vercel.json` sia presente nella cartella `frontend/`
2. Il file dovrebbe contenere il rewrite per SPA routing

---

### API calls non funzionano

**Errore**: `ERR_CONNECTION_REFUSED` o `Network Error`

**Soluzione**:
1. Verifica che `VITE_API_BASE_URL` sia configurato
2. Testa il backend direttamente: apri `https://tuo-backend.onrender.com/api/health`
3. Se il backend non risponde, controlla Render

---

### CORS errors

**Errore**: `blocked by CORS policy`

**Soluzione**:
1. Vai su Render → Environment Variables
2. Verifica `CORS_ORIGINS`
3. Deve contenere esattamente l'URL di Vercel
4. Esempio: `https://ai-tutor.vercel.app`
5. Riavvia il servizio su Render

---

## 📞 Link Utili

- [Vercel Dashboard](https://vercel.com/dashboard)
- [Vercel Docs - Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vite Docs - Env Variables](https://vitejs.dev/guide/env-and-mode.html)

---

**Ultimo aggiornamento**: 17 Ottobre 2025

