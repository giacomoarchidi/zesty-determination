#!/usr/bin/env python3
"""
Script per vedere tutti gli utenti registrati
Uso: python scripts/list_users.py
"""
from app.core.db import SessionLocal
from app.models.user import User
from collections import Counter

def list_users():
    db = SessionLocal()
    users = db.query(User).all()

    print('\n' + '='*80)
    print('📊 UTENTI REGISTRATI SULLA PIATTAFORMA')
    print('='*80 + '\n')
    
    if not users:
        print('❌ Nessun utente registrato ancora.\n')
        return

    # Lista dettagliata
    for i, user in enumerate(users, 1):
        emoji = '👑' if user.role.value == 'admin' else '🎓' if user.role.value == 'student' else '👨‍🏫' if user.role.value == 'tutor' else '👪'
        status = '✅' if user.is_active else '❌'
        print(f'{i}. {emoji} {user.email:35} | Ruolo: {user.role.value:10} | {status} Attivo')
    
    print('\n' + '='*80)
    print(f'📈 TOTALE: {len(users)} utenti')
    print('='*80 + '\n')

    # Statistiche per ruolo
    roles = Counter([u.role.value for u in users])
    print('📊 DISTRIBUZIONE PER RUOLO:')
    print('-'*40)
    for role, count in roles.items():
        emoji = '🎓' if role == 'student' else '👨‍🏫' if role == 'tutor' else '👪' if role == 'parent' else '👑'
        percentage = (count / len(users)) * 100
        print(f'  {emoji} {role.capitalize():12} {count:3} utenti ({percentage:.1f}%)')
    print()

    db.close()

if __name__ == '__main__':
    list_users()

