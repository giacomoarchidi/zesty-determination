"""
Router temporaneo per operazioni di pulizia database
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.dependencies import get_db
from app.models.user import User
from app.core.security import get_current_user
from app.models.user import User as UserModel

router = APIRouter(prefix="/api/cleanup", tags=["cleanup"])

@router.delete("/users/all")
async def delete_all_users(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancella tutti gli utenti dal database
    """
    # Temporaneamente permetto a tutti gli utenti autenticati
    # if current_user.role != "admin":
    #     raise HTTPException(status_code=403, detail="Solo gli admin possono eseguire questa operazione")
    
    try:
        # Conta utenti prima della cancellazione
        user_count = db.query(User).count()
        
        # Usa SQL raw per cancellare tutto in ordine corretto
        # Disabilita temporaneamente i foreign key checks
        db.execute("SET session_replication_role = replica;")
        
        # Cancella tutte le tabelle correlate
        db.execute("DELETE FROM student_profiles;")
        db.execute("DELETE FROM tutor_profiles;")
        db.execute("DELETE FROM parent_profiles;")
        db.execute("DELETE FROM lessons;")
        db.execute("DELETE FROM assignments;")
        db.execute("DELETE FROM feedback;")
        db.execute("DELETE FROM payments;")
        db.execute("DELETE FROM reports;")
        db.execute("DELETE FROM files;")
        db.execute("DELETE FROM availability;")
        
        # Ora cancella tutti gli utenti
        db.execute("DELETE FROM users;")
        
        # Riabilita i foreign key checks
        db.execute("SET session_replication_role = DEFAULT;")
        
        db.commit()
        
        return {
            "message": f"Cancellati {user_count} utenti e tutti i dati correlati dal database",
            "deleted_count": user_count
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Errore durante la cancellazione: {str(e)}")
