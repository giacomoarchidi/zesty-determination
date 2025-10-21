"""
Router temporaneo per operazioni di pulizia database
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.dependencies import get_db
from app.models.user import User
from app.models.lesson import Lesson
from app.core.security import get_current_user
from app.models.user import User as UserModel
from datetime import datetime
from pydantic import BaseModel

router = APIRouter(prefix="/api/cleanup", tags=["cleanup"])

class TestLessonCreate(BaseModel):
    tutor_id: int
    student_id: int
    subject: str
    start_at: str
    end_at: str
    price: float
    objectives: str

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

@router.post("/create-test-lesson")
async def create_test_lesson(
    lesson_data: TestLessonCreate,
    db: Session = Depends(get_db)
):
    """
    Crea una lezione di test per oggi
    """
    try:
        # Verifica che tutor e studente esistano
        tutor = db.query(User).filter(User.id == lesson_data.tutor_id).first()
        student = db.query(User).filter(User.id == lesson_data.student_id).first()
        
        if not tutor:
            raise HTTPException(status_code=404, detail="Tutor non trovato")
        if not student:
            raise HTTPException(status_code=404, detail="Studente non trovato")
        
        # Crea la lezione
        lesson = Lesson(
            tutor_id=lesson_data.tutor_id,
            student_id=lesson_data.student_id,
            subject=lesson_data.subject,
            start_at=datetime.fromisoformat(lesson_data.start_at.replace('Z', '+00:00')),
            end_at=datetime.fromisoformat(lesson_data.end_at.replace('Z', '+00:00')),
            status='confirmed',  # Imposta direttamente come confermata
            price=lesson_data.price,
            objectives=lesson_data.objectives,
            room_slug=f"lesson-{lesson_data.tutor_id}-{lesson_data.student_id}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        )
        
        db.add(lesson)
        db.commit()
        db.refresh(lesson)
        
        return {
            "message": "Lezione di test creata con successo",
            "lesson_id": lesson.id,
            "room_slug": lesson.room_slug,
            "status": lesson.status
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Errore durante la creazione: {str(e)}")

@router.post("/reset-user-password")
async def reset_user_password(
    email: str,
    new_hashed_password: str,
    db: Session = Depends(get_db)
):
    """
    Aggiorna la password di un utente con una password pre-hashata
    """
    try:
        from app.core.security import get_password_hash
        
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="Utente non trovato")
        
        # Salva la password hashata (già hashata da SHA-256 nel frontend)
        # Il backend farà il bcrypt su questa
        user.hashed_password = get_password_hash(new_hashed_password)
        db.commit()
        
        return {
            "message": f"Password aggiornata per {email}",
            "email": email
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Errore durante l'aggiornamento: {str(e)}")

@router.post("/register-with-frontend-hash")
async def register_with_frontend_hash(
    email: str,
    password_plaintext: str,
    role: str,
    first_name: str,
    last_name: str,
    db: Session = Depends(get_db)
):
    """
    Registra un utente simulando l'hashing del frontend (SHA-256)
    """
    try:
        from app.core.security import get_password_hash
        import hashlib
        import base64
        
        # Simula l'hashing del frontend
        sha256_hash = hashlib.sha256(password_plaintext.encode()).digest()
        b64_full = base64.b64encode(sha256_hash).decode()
        b64_urlsafe = b64_full.replace('+', '-').replace('/', '_').rstrip('=')
        frontend_hashed = b64_urlsafe[:32]
        
        # Verifica se l'utente esiste già
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            # Aggiorna la password
            existing_user.hashed_password = get_password_hash(frontend_hashed)
            db.commit()
            return {
                "message": f"Password aggiornata per utente esistente: {email}",
                "email": email,
                "frontend_hash": frontend_hashed
            }
        
        # Crea nuovo utente
        user = User(
            email=email,
            hashed_password=get_password_hash(frontend_hashed),
            role=role,
            is_active=True
        )
        
        db.add(user)
        db.commit()
        
        return {
            "message": f"Utente creato: {email}",
            "email": email,
            "role": role,
            "frontend_hash": frontend_hashed
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Errore: {str(e)}")

@router.get("/debug-lessons")
async def debug_lessons(db: Session = Depends(get_db)):
    """
    Mostra tutte le lezioni nel database per debug
    """
    try:
        lessons = db.query(Lesson).all()
        
        result = []
        for lesson in lessons:
            student = db.query(User).filter(User.id == lesson.student_id).first()
            tutor = db.query(User).filter(User.id == lesson.tutor_id).first()
            
            result.append({
                "id": lesson.id,
                "subject": lesson.subject,
                "student_id": lesson.student_id,
                "student_email": student.email if student else None,
                "tutor_id": lesson.tutor_id,
                "tutor_email": tutor.email if tutor else None,
                "status": lesson.status,
                "start_at": lesson.start_at.isoformat() if lesson.start_at else None,
                "room_slug": lesson.room_slug
            })
        
        return {
            "total_lessons": len(result),
            "lessons": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore: {str(e)}")
