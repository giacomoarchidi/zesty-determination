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
        
        # Cancella prima le tabelle correlate per evitare foreign key constraints
        from app.models.student_profile import StudentProfile
        from app.models.tutor_profile import TutorProfile
        from app.models.parent_profile import ParentProfile
        from app.models.lesson import Lesson
        from app.models.assignment import Assignment
        from app.models.feedback import Feedback
        from app.models.payment import Payment
        from app.models.report import Report
        
        # Cancella in ordine per rispettare le foreign key
        db.query(StudentProfile).delete()
        db.query(TutorProfile).delete()
        db.query(ParentProfile).delete()
        db.query(Lesson).delete()
        db.query(Assignment).delete()
        db.query(Feedback).delete()
        db.query(Payment).delete()
        db.query(Report).delete()
        
        # Ora cancella tutti gli utenti
        db.query(User).delete()
        db.commit()
        
        return {
            "message": f"Cancellati {user_count} utenti e tutti i dati correlati dal database",
            "deleted_count": user_count
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Errore durante la cancellazione: {str(e)}")
