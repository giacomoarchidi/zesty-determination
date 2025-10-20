# 🚂 Guida Migrazioni Database su Railway

## 📋 Problema Risolto

Ho **disabilitato le migrazioni automatiche in produzione** per evitare che l'healthcheck fallisca durante il deploy.

### ✅ Modifiche Apportate:

1. **Migrazioni automatiche disabilitate in prod** - L'app si avvia immediatamente senza aspettare le migrazioni
2. **Configurazione Railway ottimizzata** - Healthcheck timeout aumentato a 100 secondi
3. **Script per migrazioni manuali** - Nuovo script `backend/scripts/run_migrations.py`

---

## 🔧 Come Eseguire le Migrazioni su Railway

### Opzione 1: Tramite Railway CLI (Consigliato)

```bash
# 1. Installa Railway CLI se non l'hai già
npm install -g @railway/cli

# 2. Login su Railway
railway login

# 3. Collega il progetto
railway link

# 4. Esegui le migrazioni
railway run python scripts/run_migrations.py
```

### Opzione 2: Tramite Dashboard Railway

1. Vai su **Railway Dashboard** → Il tuo servizio backend
2. Clicca su **Settings** → **Deploy**
3. Nella sezione **Custom Start Command**, cambia temporaneamente in:
   ```bash
   python scripts/run_migrations.py && uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
4. Salva e rideploy
5. Una volta completato, **rimuovi** `python scripts/run_migrations.py &&` dal comando

### Opzione 3: Tramite Database diretto

Se hai accesso diretto al database PostgreSQL di Railway:

```bash
# 1. Ottieni le credenziali del database da Railway Dashboard
# 2. Clona il repository localmente
# 3. Imposta le variabili d'ambiente del database
export DATABASE_URL="postgresql://user:pass@host:port/dbname"

# 4. Esegui le migrazioni localmente
cd backend
alembic upgrade head
```

---

## ✅ Verifica che il Deploy Funzioni

Dopo il push, verifica che il backend sia online:

```bash
# Verifica healthcheck
curl https://zesty-determination-production.up.railway.app/api/health
```

Dovresti vedere:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-20T...",
  "environment": "prod"
}
```

---

## 🔍 Troubleshooting

### ❌ Errore: "Healthcheck failed"

**Causa**: L'app non si avvia correttamente

**Soluzione**:
1. Controlla i log su Railway Dashboard
2. Verifica che tutte le variabili d'ambiente siano configurate:
   - `DATABASE_URL`
   - `SECRET_KEY`
   - `ENV=prod`
   - `CORS_ORIGINS`

### ❌ Errore: "Database connection failed"

**Causa**: Database non configurato o credenziali errate

**Soluzione**:
1. Vai su Railway Dashboard
2. Aggiungi un **PostgreSQL service** se non l'hai già
3. Railway aggiungerà automaticamente la variabile `DATABASE_URL`
4. Rideploy il servizio

### ❌ Errore: "Tables not found"

**Causa**: Le migrazioni non sono state eseguite

**Soluzione**:
1. Esegui le migrazioni manualmente (vedi sopra)
2. Oppure, temporaneamente, abilita le migrazioni automatiche:
   - Cambia `ENV=dev` nelle variabili d'ambiente Railway
   - Rideploy
   - Le migrazioni si eseguiranno automaticamente
   - Cambia di nuovo `ENV=prod`

---

## 📊 Stato Attuale

- ✅ **Backend**: Configurato per avviarsi immediatamente in produzione
- ✅ **Healthcheck**: Aumentato timeout a 100 secondi
- ✅ **Migrazioni**: Gestite manualmente o tramite script
- ✅ **Validazione password**: Limite 72 bytes implementato

---

## 🚀 Prossimi Passi

1. **Aspetta il deploy** (2-5 minuti)
2. **Verifica l'healthcheck** passi correttamente
3. **Esegui le migrazioni** se necessario
4. **Testa la registrazione** sul frontend

---

**Creato**: 20 Ottobre 2025  
**Ultima modifica**: 20 Ottobre 2025

