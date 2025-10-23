#!/usr/bin/env python3
"""
Script per creare l'utente tutor Giacomo nel database
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.db import get_db
from app.models.user import User, Role
from app.models.tutor_profile import TutorProfile
from app.core.security import get_password_hash

def create_tutor_giacomo():
    """Crea l'utente tutor Giacomo"""
    db = next(get_db())
    
    try:
        # Controlla se l'utente esiste già
        existing_user = db.query(User).filter(User.email == 'giac.archi3@gmail.com').first()
        if existing_user:
            print(f"✅ Utente già esistente: {existing_user.email} (ruolo: {existing_user.role.value})")
            return
        
        # Crea l'utente
        user = User(
            email='giac.archi3@gmail.com',
            hashed_password=get_password_hash('Padregheddo7'),
            role=Role.tutor,
            is_active=True
        )
        
        db.add(user)
        db.flush()  # Per ottenere l'ID
        
        # Crea il profilo tutor
        tutor_profile = TutorProfile(
            user_id=user.id,
            first_name='Giacomo',
            last_name='Archidi',
            bio='Esperto tutor di matematica e fisica',
            subjects=['matematica', 'fisica'],
            hourly_rate=25.0,
            is_verified=True
        )
        
        db.add(tutor_profile)
        db.commit()
        
        print("✅ Utente tutor creato con successo!")
        print(f"📧 Email: giac.archi3@gmail.com")
        print(f"🔑 Password: Padregheddo7")
        print(f"👤 Ruolo: tutor")
        print(f"💰 Tariffa oraria: €25/h")
        
    except Exception as e:
        print(f"❌ Errore: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_tutor_giacomo()
