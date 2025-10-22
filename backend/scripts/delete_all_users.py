#!/usr/bin/env python3
"""
Script per cancellare tutti gli utenti dal database Railway
"""

import os
import sys
import psycopg2
from datetime import datetime

# Configurazione database Railway
DATABASE_URL = "postgresql://postgres:GqexMwkTeCHRhMheTVdNxrVroq0AjEvM@mainline.proxy.rlwy.net:49090/railway?sslmode=require"

def delete_all_users():
    """Cancella tutti gli utenti dal database"""
    try:
        # Connessione al database
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        print("🔍 Connesso al database Railway...")
        
        # Conta utenti prima della cancellazione
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count_before = cursor.fetchone()[0]
        print(f"📊 Utenti trovati: {user_count_before}")
        
        if user_count_before == 0:
            print("✅ Nessun utente da cancellare")
            return
        
        # Conferma cancellazione
        print(f"⚠️  ATTENZIONE: Stai per cancellare {user_count_before} utenti!")
        confirm = input("Digita 'DELETE' per confermare: ")
        
        if confirm != "DELETE":
            print("❌ Operazione annullata")
            return
        
        # Cancella tutti gli utenti (cascade cancellerà anche i profili correlati)
        cursor.execute("DELETE FROM users")
        deleted_count = cursor.rowcount
        
        # Commit delle modifiche
        conn.commit()
        
        print(f"✅ Cancellati {deleted_count} utenti dal database")
        print(f"🕐 Operazione completata alle: {datetime.now().strftime('%H:%M:%S')}")
        
    except Exception as e:
        print(f"❌ Errore durante la cancellazione: {str(e)}")
        if conn:
            conn.rollback()
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    delete_all_users()

