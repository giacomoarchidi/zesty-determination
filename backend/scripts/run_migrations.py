"""
Script per eseguire le migrazioni del database su Railway/produzione

Uso:
    python scripts/run_migrations.py
"""
import sys
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migrations():
    """Esegui le migrazioni Alembic"""
    try:
        logger.info("🔄 Esecuzione migrazioni database...")
        
        # Import Alembic
        from alembic.config import Config
        from alembic import command
        
        # Trova il percorso di alembic.ini
        current_dir = Path(__file__).parent.parent
        alembic_ini_path = current_dir / "alembic.ini"
        
        if not alembic_ini_path.exists():
            logger.error(f"❌ alembic.ini non trovato in: {alembic_ini_path}")
            sys.exit(1)
        
        logger.info(f"📁 Usando alembic.ini: {alembic_ini_path}")
        
        # Configura Alembic
        alembic_cfg = Config(str(alembic_ini_path))
        
        # Esegui le migrazioni
        command.upgrade(alembic_cfg, "head")
        
        logger.info("✅ Migrazioni database completate con successo!")
        return 0
        
    except Exception as e:
        logger.error(f"❌ Errore durante le migrazioni: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(run_migrations())

