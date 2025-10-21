from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.routers import (
    auth, users, lessons, availability, payments, assignments, files, feedback, reports, 
    tutor, parent, admin, health, video, cleanup
)
import logging
import os
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Tutoring Platform API",
    description="API completa per piattaforma di tutoring online",
    version="0.1.0",
    docs_url="/docs" if settings.ENV == "dev" else None,
    redoc_url="/redoc" if settings.ENV == "dev" else None,
)

# Startup event: Run database migrations automatically
@app.on_event("startup")
async def run_migrations():
    """Esegui automaticamente le migrazioni del database all'avvio"""
    # In produzione su Railway, salta le migrazioni automatiche
    # Le migrazioni dovrebbero essere eseguite manualmente o tramite CI/CD
    if settings.ENV == "prod":
        logger.info("⏭️ Ambiente di produzione: le migrazioni automatiche sono disabilitate")
        logger.info("✅ Applicazione pronta per il traffico")
        return
    
    try:
        logger.info("🔄 Esecuzione migrazioni database...")
        
        # Import Alembic
        from alembic.config import Config
        from alembic import command
        
        # Trova il percorso di alembic.ini
        # Cerca nella directory corrente e nelle directory parent
        current_dir = Path.cwd()
        alembic_ini_path = None
        
        # Prova prima nella directory corrente
        if (current_dir / "alembic.ini").exists():
            alembic_ini_path = str(current_dir / "alembic.ini")
        # Prova nella directory backend se siamo in una sottocartella
        elif (current_dir.parent / "alembic.ini").exists():
            alembic_ini_path = str(current_dir.parent / "alembic.ini")
        # Prova nella directory app
        elif (current_dir / "app" / ".." / "alembic.ini").exists():
            alembic_ini_path = str((current_dir / "app" / ".." / "alembic.ini").resolve())
        
        if not alembic_ini_path:
            logger.warning("⚠️ alembic.ini non trovato, salto le migrazioni")
            return
        
        logger.info(f"📁 Usando alembic.ini: {alembic_ini_path}")
        
        # Configura Alembic
        alembic_cfg = Config(alembic_ini_path)
        
        # Esegui le migrazioni
        command.upgrade(alembic_cfg, "head")
        
        logger.info("✅ Migrazioni database completate con successo!")
        
    except Exception as e:
        logger.error(f"❌ Errore durante le migrazioni: {e}")
        logger.warning("⚠️ L'applicazione continuerà comunque...")
        # Non blocchiamo l'avvio dell'app se le migrazioni falliscono


# CORS middleware - Configurazione aggiornata
# CORS middleware - Configurazione da variabili d'ambiente
# CORS middleware - Usa variabile d'ambiente
allowed_origins = settings.get_cors_origins() if settings.CORS_ORIGINS else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Trusted host middleware for production (disabilitato per compatibilità Railway/Vercel)
# Railway e Vercel usano proxy interni che possono causare conflitti con questo middleware
# if settings.ENV == "prod":
#     allowed_hosts = settings.get_allowed_hosts()
#     if allowed_hosts:
#         app.add_middleware(
#             TrustedHostMiddleware,
#             allowed_hosts=allowed_hosts
#         )

# Global exception handler
# Global exception handler con logging dettagliato
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for unhandled errors with detailed logging"""
    logger.error(f"❌ Errore non gestito: {type(exc).__name__}: {str(exc)}")
    logger.error(f"📍 URL: {request.url}")
    logger.error(f"🔧 Metodo: {request.method}")
    
    # Logga il body della richiesta se possibile
    try:
        body = await request.body()
        logger.error(f"📦 Body: {body}")
    except Exception as e:
        logger.error(f"❌ Errore nel leggere il body: {e}")
    
    response = JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "type": "internal_error",
            "error": str(exc)
        }
    )
    # Aggiungi header CORS anche per gli errori
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, Accept, Origin"
    return response

# Include routers
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(lessons.router, prefix="/api/lessons", tags=["lessons"])
app.include_router(availability.router, prefix="/api/availability", tags=["availability"])
app.include_router(payments.router, prefix="/api/payments", tags=["payments"])
app.include_router(assignments.router, prefix="/api/assignments", tags=["assignments"])
app.include_router(files.router, prefix="/api/files", tags=["files"])
app.include_router(feedback.router, prefix="/api/feedback", tags=["feedback"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(tutor.router, prefix="/api/tutor", tags=["tutor"])
app.include_router(parent.router, prefix="/api/parent", tags=["parent"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(video.router, prefix="/api/video", tags=["video"])
app.include_router(cleanup.router, tags=["cleanup"])

# Root endpoint  
@app.get("/")
async def root():
    """Root endpoint - CORS Fixed"""
    return {
        "message": "Tutoring Platform API",
        "version": "0.1.0",
        "environment": settings.ENV,
        "docs": "/docs" if settings.ENV == "dev" else "disabled",
        "cors": "enabled"
    }
