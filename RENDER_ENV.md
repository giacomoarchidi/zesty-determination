# 🔧 Variabili d'Ambiente per Render

Copia e incolla queste variabili nelle impostazioni del tuo servizio su Render.

## Come configurare su Render

1. Vai su [Render Dashboard](https://dashboard.render.com/)
2. Seleziona il tuo servizio backend
3. Vai su **Environment** nella sidebar
4. Clicca su **Add Environment Variable**
5. Aggiungi le variabili qui sotto

---

## ⚙️ Variabili Obbligatorie

```
ENV=prod
```

```
SECRET_KEY=GENERA_UNA_CHIAVE_RANDOM_QUI
```
> **IMPORTANTE**: Genera una chiave sicura random. Puoi usare: `python -c "import secrets; print(secrets.token_urlsafe(32))"`

```
JWT_ALGO=HS256
```

```
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

```
CORS_ORIGINS=https://tuo-frontend.vercel.app,https://tuo-frontend-*.vercel.app
```
> **IMPORTANTE**: Sostituisci con il tuo vero URL di Vercel! Puoi trovarlo nella dashboard di Vercel.

```
FRONTEND_URL=https://tuo-frontend.vercel.app
```
> **IMPORTANTE**: Sostituisci con il tuo vero URL di Vercel!

---

## 🎥 Agora Video SDK (Videochiamate)

```
AGORA_APP_ID=4d3c5454d08847ed9536332dad1b6759
```

```
AGORA_APP_CERTIFICATE=5c6993d86ecc434682beb8873b3ae5c8
```

---

## 🗄️ Database

Render fornisce automaticamente `DATABASE_URL` quando crei un PostgreSQL database e lo colleghi al servizio.

**Non devi configurare manualmente** questa variabile se hai:
1. Creato un PostgreSQL database su Render
2. Collegato il database al tuo servizio web

Se vuoi usare un database esterno, configura:
```
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

---

## 📧 Email (Opzionale - per ora)

Se vuoi abilitare le notifiche email, configura:

```
SMTP_HOST=smtp.gmail.com
```

```
SMTP_PORT=587
```

```
SMTP_USER=tuo-email@gmail.com
```

```
SMTP_PASSWORD=tua-app-password
```
> **Nota**: Per Gmail, devi generare una "App Password" nelle impostazioni di sicurezza

```
EMAIL_FROM=noreply@tuo-dominio.com
```

---

## 💳 Stripe (Opzionale - per pagamenti)

Se vuoi abilitare i pagamenti, configura:

```
STRIPE_SECRET_KEY=sk_test_...
```

```
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 🤖 OpenAI (Opzionale - per AI)

Se vuoi abilitare funzionalità AI:

```
OPENAI_API_KEY=sk-...
```

```
OPENAI_MODEL=gpt-4
```

---

## 📦 Storage S3/MinIO (Opzionale - per file upload)

Se vuoi abilitare l'upload di file:

```
S3_ENDPOINT_URL=https://s3.amazonaws.com
```

```
S3_ACCESS_KEY=tuo-access-key
```

```
S3_SECRET_KEY=tuo-secret-key
```

```
S3_BUCKET=ai-tutor
```

```
S3_REGION=us-east-1
```

```
S3_USE_SSL=True
```

---

## 🔴 Redis (Opzionale - per caching)

Se vuoi abilitare la cache:

```
REDIS_URL=redis://user:password@host:6379
```

> Puoi usare [Upstash Redis](https://upstash.com/) per un servizio Redis gratuito compatibile con Render

---

## ✅ Verifica Configurazione

Dopo aver configurato le variabili:

1. Vai su **Manual Deploy** e clicca **Deploy**
2. Aspetta che il deploy finisca
3. Testa il backend: `https://tuo-backend.onrender.com/api/health`
4. Dovresti vedere:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-17T...",
  "environment": "prod"
}
```

---

## 🐛 Troubleshooting

### Il deploy fallisce

- Controlla i **logs** su Render
- Verifica che tutte le variabili **obbligatorie** siano configurate
- Assicurati che `DATABASE_URL` sia valido

### CORS errors

- Verifica che `CORS_ORIGINS` contenga **esattamente** l'URL di Vercel
- Non dimenticare il protocollo `https://`
- Non aggiungere `/` alla fine dell'URL

### Database connection errors

- Assicurati che il database PostgreSQL sia **collegato** al servizio
- Controlla che `DATABASE_URL` sia presente nelle variabili d'ambiente
- Verifica che il database sia **attivo**

---

**Ultimo aggiornamento**: 17 Ottobre 2025

