#!/usr/bin/env python3
"""
Script per aggiornare la password dell'utente su Railway
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.db import get_db
from app.models.user import User
from app.core.security import get_password_hash

def update_password_railway():
    """Aggiorna la password dell'utente su Railway"""
    db = next(get_db())
    
    # Trova l'utente
    user = db.query(User).filter(User.email == 'giac.archi3@gmail.com').first()
    if not user:
        print("❌ Utente non trovato")
        return
    
    print(f"✅ Utente trovato: {user.email} (ID: {user.id})")
    print(f"🔍 Password hash attuale: {user.hashed_password[:50]}...")
    
    # Aggiorna la password
    new_password = "123456"
    new_hash = get_password_hash(new_password)
    
    user.hashed_password = new_hash
    db.commit()
    
    print(f"✅ Password aggiornata per {user.email}")
    print(f"🔍 Nuovo hash: {new_hash[:50]}...")

if __name__ == "__main__":
    update_password_railway()
