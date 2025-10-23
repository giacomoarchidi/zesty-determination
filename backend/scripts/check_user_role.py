#!/usr/bin/env python3
"""
Script per controllare il ruolo di un utente nel database
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.db import get_db
from app.models.user import User, Role

def check_user_role():
    """Controlla il ruolo dell'utente giac.archi3@gmail.com"""
    db = next(get_db())
    
    # Trova l'utente
    user = db.query(User).filter(User.email == 'giac.archi3@gmail.com').first()
    if not user:
        print("❌ Utente non trovato")
        return
    
    print(f"✅ Utente trovato:")
    print(f"📧 Email: {user.email}")
    print(f"🆔 ID: {user.id}")
    print(f"👤 Ruolo: {user.role.value}")
    print(f"🔍 Tipo ruolo: {type(user.role)}")
    print(f"✅ Attivo: {user.is_active}")
    print(f"📅 Creato: {user.created_at}")
    
    # Controlla se ha un profilo tutor
    if user.tutor_profile:
        print(f"🎓 Profilo tutor: {user.tutor_profile.first_name} {user.tutor_profile.last_name}")
        print(f"💰 Tariffa oraria: {user.tutor_profile.hourly_rate}")
    else:
        print("❌ Nessun profilo tutor trovato")
    
    # Controlla se ha un profilo studente
    if user.student_profile:
        print(f"🎓 Profilo studente: {user.student_profile.first_name} {user.student_profile.last_name}")
    else:
        print("❌ Nessun profilo studente trovato")

if __name__ == "__main__":
    check_user_role()
