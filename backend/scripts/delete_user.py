#!/usr/bin/env python3
"""
Script per cancellare utenti dal database Railway
Uso: DATABASE_URL="postgresql://..." python scripts/delete_user.py
"""
import sys
import os
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import enum

# Ottieni DATABASE_URL da variabile d'ambiente
database_url = os.getenv('DATABASE_URL')
if not database_url:
    print('❌ Errore: Imposta DATABASE_URL')
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

def list_users():
    """Lista tutti gli utenti"""
    db = SessionLocal()
    users = db.query(User).all()
    
    print('\n' + '='*80)
    print('📊 UTENTI NEL DATABASE')
    print('='*80 + '\n')
    
    if not users:
        print('❌ Nessun utente trovato.\n')
        return []
    
    for i, user in enumerate(users, 1):
        emoji = '👑' if user.role.value == 'admin' else '🎓' if user.role.value == 'student' else '👨‍🏫' if user.role.value == 'tutor' else '👪'
        print(f'{i}. {emoji} ID: {user.id:3} | {user.email:35} | Ruolo: {user.role.value}')
    
    print()
    db.close()
    return users

def delete_user_by_email(email):
    """Cancella utente per email"""
    db = SessionLocal()
    
    try:
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            print(f'❌ Utente {email} non trovato!')
            return False
        
        # Conferma
        print(f'\n⚠️  Stai per cancellare:')
        print(f'   Email: {user.email}')
        print(f'   Ruolo: {user.role.value}')
        print(f'   ID: {user.id}')
        
        confirm = input('\n❓ Sei sicuro? (scrivi "SI" per confermare): ')
        
        if confirm.strip().upper() != 'SI':
            print('❌ Cancellazione annullata.')
            return False
        
        db.delete(user)
        db.commit()
        print(f'✅ Utente {email} cancellato con successo!')
        return True
        
    except Exception as e:
        print(f'❌ Errore: {e}')
        db.rollback()
        return False
    finally:
        db.close()

def delete_user_by_id(user_id):
    """Cancella utente per ID"""
    db = SessionLocal()
    
    try:
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            print(f'❌ Utente con ID {user_id} non trovato!')
            return False
        
        # Conferma
        print(f'\n⚠️  Stai per cancellare:')
        print(f'   Email: {user.email}')
        print(f'   Ruolo: {user.role.value}')
        print(f'   ID: {user.id}')
        
        confirm = input('\n❓ Sei sicuro? (scrivi "SI" per confermare): ')
        
        if confirm.strip().upper() != 'SI':
            print('❌ Cancellazione annullata.')
            return False
        
        db.delete(user)
        db.commit()
        print(f'✅ Utente cancellato con successo!')
        return True
        
    except Exception as e:
        print(f'❌ Errore: {e}')
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == '__main__':
    print('\n🗑️  CANCELLAZIONE UTENTI - DATABASE RAILWAY\n')
    
    # Lista utenti
    users = list_users()
    
    if not users:
        sys.exit(0)
    
    print('Opzioni:')
    print('1. Cancella per Email')
    print('2. Cancella per ID')
    print('3. Esci')
    
    choice = input('\nScegli (1/2/3): ').strip()
    
    if choice == '1':
        email = input('\nInserisci email da cancellare: ').strip()
        delete_user_by_email(email)
    elif choice == '2':
        user_id = input('\nInserisci ID da cancellare: ').strip()
        try:
            delete_user_by_id(int(user_id))
        except ValueError:
            print('❌ ID non valido!')
    else:
        print('👋 Uscita.')

