#!/usr/bin/env python3
"""
Script per creare un admin direttamente sul database Railway
Uso: DATABASE_URL="postgresql://..." python scripts/create_admin_railway.py
"""
import sys
import os
import hashlib
import bcrypt
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import enum

# Ottieni DATABASE_URL da variabile d'ambiente
database_url = os.getenv('DATABASE_URL')
if not database_url:
    print('❌ Errore: Imposta DATABASE_URL')
    print('Esempio: export DATABASE_URL="postgresql://user:pass@host:port/dbname"')
    sys.exit(1)

# Crea engine
engine = create_engine(database_url)
SessionLocal = sessionmaker(bind=engine)

# Definisci modelli minimali
Base = declarative_base()

class Role(str, enum.Enum):
    student = "student"
    tutor = "tutor"
    parent = "parent"
    admin = "admin"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(Role), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)

# Crea admin
def create_admin():
    db = SessionLocal()
    
    try:
        # Controlla se esiste già
        existing = db.query(User).filter(User.email == 'admin@tutor.com').first()
        if existing:
            print('✅ Admin già esistente!')
            print(f'📧 Email: {existing.email}')
            print(f'👤 Ruolo: {existing.role.value}')
            return
        
        # Crea password hash (stesso metodo usato nell'app)
        password = 'admin123'
        password_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password_hash.encode('utf-8'), salt).decode('utf-8')
        
        # Crea admin
        admin = User(
            email='admin@tutor.com',
            hashed_password=hashed,
            role=Role.admin,
            is_active=True,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        db.add(admin)
        db.commit()
        
        print('✅ Admin creato con successo su Railway!')
        print('📧 Email: admin@tutor.com')
        print('🔑 Password: admin123')
        print('\nOra puoi fare login su: https://ai-tutor-platform-iota.vercel.app/login')
        
    except Exception as e:
        print(f'❌ Errore: {e}')
        db.rollback()
    finally:
        db.close()

if __name__ == '__main__':
    create_admin()

