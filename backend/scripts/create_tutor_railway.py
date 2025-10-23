#!/usr/bin/env python3
"""
Script per creare l'utente tutor su Railway
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.db import get_db
from app.models.user import User, Role
from app.core.security import get_password_hash
from app.models.tutor_profile import TutorProfile

def create_tutor_on_railway():
    """Crea l'utente tutor su Railway"""
    db = next(get_db())
    
    # Verifica se l'utente esiste già
    existing_user = db.query(User).filter(User.email == 'giac.archi3@gmail.com').first()
    if existing_user:
        print(f"✅ Utente già esistente: {existing_user.email}")
        return existing_user
    
    # Crea l'utente
    user = User(
        email='giac.archi3@gmail.com',
        hashed_password=get_password_hash('123456'),
        role=Role.tutor,
        is_active=True
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    print(f"✅ Utente creato: {user.email} (ID: {user.id})")
    
    # Crea il profilo tutor
    tutor_profile = TutorProfile(
        user_id=user.id,
        first_name='Giacomo',
        last_name='Archidi',
        bio='Tutor esperto in matematica e fisica',
        subjects='{matematica,fisica}',
        hourly_rate=25.0,
        is_verified=True
    )
    
    db.add(tutor_profile)
    db.commit()
    db.refresh(tutor_profile)
    
    print(f"✅ Profilo tutor creato: {tutor_profile.first_name} {tutor_profile.last_name}")
    
    return user

if __name__ == "__main__":
    create_tutor_on_railway()
