#!/usr/bin/env python3
"""
Script per cancellare tutti gli utenti tramite API Railway
"""

import requests
import json

# Configurazione API
API_BASE_URL = "https://zesty-determination-production.up.railway.app"
ADMIN_EMAIL = "giac.archi3@gmail.com"
ADMIN_PASSWORD = "123456"

def get_admin_token():
    """Ottieni token admin per le operazioni"""
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        if response.status_code == 200:
            data = response.json()
            return data["access_token"]
        else:
            print(f"❌ Errore login admin: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Errore connessione: {str(e)}")
        return None

def get_all_users(token):
    """Ottieni lista di tutti gli utenti"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{API_BASE_URL}/api/admin/users", headers=headers)
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ Errore ottenimento utenti: {response.status_code} - {response.text}")
            return []
    except Exception as e:
        print(f"❌ Errore API: {str(e)}")
        return []

def delete_user(token, user_id):
    """Cancella un utente specifico"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.delete(f"{API_BASE_URL}/api/admin/users/{user_id}", headers=headers)
        
        if response.status_code == 200:
            return True
        else:
            print(f"❌ Errore cancellazione utente {user_id}: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Errore API: {str(e)}")
        return False

def main():
    """Funzione principale"""
    print("🔍 Ottenendo token admin...")
    token = get_admin_token()
    
    if not token:
        print("❌ Impossibile ottenere token admin")
        return
    
    print("✅ Token admin ottenuto")
    
    print("🔍 Ottenendo lista utenti...")
    users = get_all_users(token)
    
    if not users:
        print("✅ Nessun utente trovato")
        return
    
    print(f"📊 Trovati {len(users)} utenti")
    
    # Mostra utenti
    for user in users:
        print(f"  - ID: {user.get('id')}, Email: {user.get('email')}, Ruolo: {user.get('role')}")
    
    # Conferma cancellazione
    print(f"\n⚠️  ATTENZIONE: Stai per cancellare {len(users)} utenti!")
    confirm = input("Digita 'DELETE' per confermare: ")
    
    if confirm != "DELETE":
        print("❌ Operazione annullata")
        return
    
    # Cancella tutti gli utenti
    deleted_count = 0
    for user in users:
        user_id = user.get('id')
        if user_id:
            print(f"🗑️  Cancellando utente {user_id}...")
            if delete_user(token, user_id):
                deleted_count += 1
                print(f"✅ Utente {user_id} cancellato")
            else:
                print(f"❌ Errore cancellazione utente {user_id}")
    
    print(f"\n🎉 Operazione completata!")
    print(f"✅ Cancellati {deleted_count} utenti su {len(users)}")

if __name__ == "__main__":
    main()
