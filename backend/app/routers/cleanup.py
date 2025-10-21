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
    Cancella tutti gli utenti dal database (solo per admin)
    """
    # Verifica che sia admin
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Solo gli admin possono eseguire questa operazione")
    
    try:
        # Conta utenti prima della cancellazione
        user_count = db.query(User).count()
        
        # Cancella tutti gli utenti
        db.query(User).delete()
        db.commit()
        
        return {
            "message": f"Cancellati {user_count} utenti dal database",
            "deleted_count": user_count
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Errore durante la cancellazione: {str(e)}")
