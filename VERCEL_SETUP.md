# 🚀 Configurazione Vercel - Setup Veloce

## ✅ Backend URL
```
https://ai-tutor-backend-kwfl.onrender.com
```

---

## 📝 Step da Seguire su Vercel

### Step 1: Aggiungi Variabile d'Ambiente

1. Vai su: https://vercel.com/dashboard
2. Clicca sul progetto **"ai-tutor-platform-iota"**
3. Vai su **Settings** (nella barra superiore)
4. Nel menu laterale, clicca **Environment Variables**
5. Clicca **"Add New"**
6. Compila:
   ```
   Name: VITE_API_BASE_URL
   Value: https://ai-tutor-backend-kwfl.onrender.com
   ```
7. Seleziona tutti gli ambienti:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
8. Clicca **"Save"**

### Step 2: Redeploy il Frontend

1. Vai sulla tab **Deployments** (nella barra superiore)
2. Trova l'ultimo deployment in lista (quello più in alto)
3. Clicca sui **tre puntini (⋯)** a destra
4. Clicca **"Redeploy"**
5. Nella finestra che appare, clicca **"Redeploy"** di nuovo
6. Aspetta 1-2 minuti che il build finisca

### Step 3: Testa il Sito

1. Apri: https://ai-tutor-platform-iota.vercel.app
2. Premi **F12** per aprire la Console
3. Vai su **"Crea Profilo"**
4. Compila il form e clicca **"Crea Profilo"**
5. Nella console **NON** dovresti vedere:
   - ❌ `Backend not available`
   - ❌ `:8001/api/auth/login Failed to load resource`
6. **Dovresti vedere**:
   - ✅ `Login response: {...}` con dati veri
   - ✅ Reindirizzamento alla dashboard

---

## 🎯 Checklist

- [ ] Variabile `VITE_API_BASE_URL` aggiunta su Vercel
- [ ] Frontend redeployato
- [ ] Sito testato e funzionante
- [ ] Registrazione utente funziona
- [ ] Login funziona
- [ ] Dashboard accessibile

---

## 🐛 Problemi Comuni

### "Backend not available" nella console
→ Aspetta 30-60 secondi. Il piano Free di Render va in sleep e ci vuole tempo per riattivarsi al primo accesso.

### Ancora errori dopo redeploy
→ Fai "Hard Refresh" del browser: `Ctrl+Shift+R` (Windows) o `Cmd+Shift+R` (Mac)

### CORS errors
→ Verifica che su Render il backend abbia configurato:
```
CORS_ORIGINS=https://ai-tutor-platform-iota.vercel.app
FRONTEND_URL=https://ai-tutor-platform-iota.vercel.app
```

---

## ✅ Tutto Configurato!

Dopo questi step, il tuo sito sarà completamente funzionante in produzione! 🎉

