#!/usr/bin/env python3
"""
Script per aggiornare il ruolo di un utente nel database
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.db import get_db
from app.models.user import User, Role

def update_user_role():
    """Aggiorna il ruolo dell'utente giac.archi3@gmail.com a tutor"""
    db = next(get_db())
    
    try:
        # Trova l'utente
        user = db.query(User).filter(User.email == 'giac.archi3@gmail.com').first()
        if not user:
            print("❌ Utente non trovato")
            return
        
        print(f"✅ Utente trovato: {user.email}")
        print(f"🔍 Ruolo attuale: {user.role.value}")
        
        # Aggiorna il ruolo a tutor
        user.role = Role.tutor
        db.commit()
        
        print(f"✅ Ruolo aggiornato a: {user.role.value}")
        
        # Verifica l'aggiornamento
        updated_user = db.query(User).filter(User.email == 'giac.archi3@gmail.com').first()
        print(f"🔍 Verifica - Ruolo finale: {updated_user.role.value}")
        
    except Exception as e:
        print(f"❌ Errore: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_user_role()
