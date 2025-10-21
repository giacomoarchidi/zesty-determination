from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.agora import AgoraService
from app.routers.auth import require_roles
from app.models.user import Role
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class JoinRoomRequest(BaseModel):
    lesson_id: int

class JoinRoomResponse(BaseModel):
    token: str
    app_id: str
    channel: str
    uid: int
    expires_at: int
    lesson_id: int

class RoomStatus(BaseModel):
    lesson_id: int
    channel: str
    is_active: bool
    participants_count: int
    start_time: str
    end_time: str

# ----------------------
#  Quiz (in-memory MVP)
# ----------------------

class QuizLaunchRequest(BaseModel):
    question: str
    options: List[str]
    correct_index: int

class QuizState(BaseModel):
    active: bool
    question: Optional[str] = None
    options: Optional[List[str]] = None
    reveal: bool = False
    answers_count: Dict[int, int] = {}

class QuizAnswerRequest(BaseModel):
    answer_index: int

class QuizAnswerResponse(BaseModel):
    accepted: bool
    correct: Optional[bool] = None

# lesson_id -> state
_QUIZ_STATE: Dict[int, Dict[str, Any]] = {}

# ----------------------
#  AI Notes (in-memory)
# ----------------------

class NotesState(BaseModel):
    active: bool
    lines: List[str]

# lesson_id -> notes state
_NOTES_STATE: Dict[int, Dict[str, Any]] = {}

@router.post("/join", response_model=JoinRoomResponse)
async def join_video_room(
    request: JoinRoomRequest,
    current_user: User = Depends(require_roles([Role.student, Role.tutor])),
    db: Session = Depends(get_db)
):
    """
    Genera token per entrare nella video room della lezione
    """
    try:
        agora_service = AgoraService(db)
        
        # Genera nome canale e UID
        channel_name = agora_service.generate_channel_name(request.lesson_id)
        uid = agora_service.generate_uid(current_user.id)
        
        # Genera token RTC
        token_data = agora_service.generate_rtc_token(
            lesson_id=request.lesson_id,
            user_id=current_user.id,
            channel_name=channel_name,
            uid=uid
        )
        
        logger.info(f"Utente {current_user.id} ha richiesto accesso alla lezione {request.lesson_id}")
        
        return JoinRoomResponse(**token_data)
        
    except ValueError as e:
        logger.warning(f"Accesso negato alla lezione {request.lesson_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Errore join video room: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Errore interno del server"
        )

@router.get("/room/{lesson_id}/status", response_model=RoomStatus)
async def get_room_status(
    lesson_id: int,
    current_user: User = Depends(require_roles([Role.student, Role.tutor])),
    db: Session = Depends(get_db)
):
    """
    Ottieni lo status della video room
    """
    try:
        agora_service = AgoraService(db)
        
        # Verifica accesso
        if not agora_service.validate_lesson_access(lesson_id, current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Accesso negato alla lezione"
            )
        
        # Ottieni dettagli lezione
        from app.models.lesson import Lesson
        lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
        if not lesson:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lezione non trovata"
            )
        
        channel_name = agora_service.generate_channel_name(lesson_id)
        
        return RoomStatus(
            lesson_id=lesson_id,
            channel=channel_name,
            is_active=lesson.status == "confirmed",
            participants_count=0,  # TODO: Implementare contatore partecipanti real-time
            start_time=lesson.start_at.isoformat(),
            end_time=lesson.end_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Errore get room status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Errore interno del server"
        )

@router.post("/room/{lesson_id}/start-recording")
async def start_recording(
    lesson_id: int,
    current_user: User = Depends(require_roles([Role.tutor])),
    db: Session = Depends(get_db)
):
    """
    Avvia registrazione della lezione (solo tutor)
    """
    try:
        agora_service = AgoraService(db)
        
        # Verifica che sia il tutor della lezione
        from app.models.lesson import Lesson
        lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
        if not lesson or lesson.tutor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo il tutor può avviare la registrazione"
            )
        
        # TODO: Implementare start recording con Agora Cloud Recording API
        logger.info(f"Tutor {current_user.id} ha avviato registrazione per lezione {lesson_id}")
        
        return {
            "message": "Registrazione avviata",
            "lesson_id": lesson_id,
            "recording_id": f"recording_{lesson_id}_{int(datetime.utcnow().timestamp())}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Errore start recording: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Errore interno del server"
        )

@router.post("/room/{lesson_id}/stop-recording")
async def stop_recording(
    lesson_id: int,
    current_user: User = Depends(require_roles([Role.tutor])),
    db: Session = Depends(get_db)
):
    """
    Ferma registrazione della lezione (solo tutor)
    """
    try:
        agora_service = AgoraService(db)
        
        # Verifica che sia il tutor della lezione
        from app.models.lesson import Lesson
        lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
        if not lesson or lesson.tutor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo il tutor può fermare la registrazione"
            )
        
        # TODO: Implementare stop recording con Agora Cloud Recording API
        logger.info(f"Tutor {current_user.id} ha fermato registrazione per lezione {lesson_id}")
        
        return {
            "message": "Registrazione fermata",
            "lesson_id": lesson_id,
            "recording_url": f"https://example.com/recordings/{lesson_id}.mp4"  # TODO: URL reale
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Errore stop recording: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Errore interno del server"
        )

# ----------------------
# Quiz endpoints
# ----------------------

@router.post("/room/{lesson_id}/quiz/launch", response_model=QuizState)
async def launch_quiz(
    lesson_id: int,
    payload: QuizLaunchRequest,
    current_user: User = Depends(require_roles([Role.tutor])),
    db: Session = Depends(get_db)
):
    try:
        # Verifica che sia il tutor della lezione
        from app.models.lesson import Lesson
        lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
        if not lesson or lesson.tutor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo il tutor può lanciare un quiz"
            )

        if not payload.options or len(payload.options) < 2:
            raise HTTPException(status_code=400, detail="Fornire almeno 2 opzioni")
        if payload.correct_index < 0 or payload.correct_index >= len(payload.options):
            raise HTTPException(status_code=400, detail="Indice risposta corretta non valido")

        _QUIZ_STATE[lesson_id] = {
            "active": True,
            "question": payload.question,
            "options": payload.options,
            "correct_index": payload.correct_index,
            "reveal": False,
            "answers": {},  # user_id -> answer_index
            "launched_at": datetime.utcnow().isoformat(),
        }

        logger.info(f"Quiz lanciato per lezione {lesson_id} da tutor {current_user.id}")
        return QuizState(
            active=True,
            question=payload.question,
            options=payload.options,
            reveal=False,
            answers_count={}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Errore launch quiz: {str(e)}")
        raise HTTPException(status_code=500, detail="Errore interno del server")


@router.get("/room/{lesson_id}/quiz", response_model=QuizState)
async def get_quiz_state(
    lesson_id: int,
    current_user: User = Depends(require_roles([Role.student, Role.tutor])),
    db: Session = Depends(get_db)
):
    try:
        # Verifica accesso
        agora_service = AgoraService(db)
        if not agora_service.validate_lesson_access(lesson_id, current_user.id):
            raise HTTPException(status_code=403, detail="Accesso negato alla lezione")

        state = _QUIZ_STATE.get(lesson_id)
        if not state or not state.get("active"):
            return QuizState(active=False, reveal=False, answers_count={})

        # aggrega conteggi risposte (senza rivelare la corretta se non reveal)
        answers: Dict[int, int] = {}
        for _, idx in state.get("answers", {}).items():
            answers[idx] = answers.get(idx, 0) + 1

        return QuizState(
            active=True,
            question=state.get("question"),
            options=state.get("options"),
            reveal=bool(state.get("reveal")),
            answers_count=answers
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Errore get quiz: {str(e)}")
        raise HTTPException(status_code=500, detail="Errore interno del server")


@router.post("/room/{lesson_id}/quiz/answer", response_model=QuizAnswerResponse)
async def answer_quiz(
    lesson_id: int,
    payload: QuizAnswerRequest,
    current_user: User = Depends(require_roles([Role.student, Role.tutor])),
    db: Session = Depends(get_db)
):
    try:
        # Verifica accesso
        agora_service = AgoraService(db)
        if not agora_service.validate_lesson_access(lesson_id, current_user.id):
            raise HTTPException(status_code=403, detail="Accesso negato alla lezione")

        state = _QUIZ_STATE.get(lesson_id)
        if not state or not state.get("active"):
            return QuizAnswerResponse(accepted=False)

        options = state.get("options", [])
        if payload.answer_index < 0 or payload.answer_index >= len(options):
            raise HTTPException(status_code=400, detail="Indice risposta non valido")

        # registra/aggiorna risposta utente
        answers: Dict[int, int] = state.setdefault("answers", {})
        answers[current_user.id] = payload.answer_index

        is_correct = payload.answer_index == state.get("correct_index")
        return QuizAnswerResponse(accepted=True, correct=is_correct)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Errore answer quiz: {str(e)}")
        raise HTTPException(status_code=500, detail="Errore interno del server")


@router.post("/room/{lesson_id}/quiz/close", response_model=QuizState)
async def close_quiz(
    lesson_id: int,
    current_user: User = Depends(require_roles([Role.tutor])),
    db: Session = Depends(get_db)
):
    try:
        # Verifica tutor
        from app.models.lesson import Lesson
        lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
        if not lesson or lesson.tutor_id != current_user.id:
            raise HTTPException(status_code=403, detail="Solo il tutor può chiudere il quiz")

        state = _QUIZ_STATE.get(lesson_id)
        if not state:
            return QuizState(active=False, reveal=False, answers_count={})

        state["reveal"] = True
        # disattiva il quiz dopo la rivelazione per evitare apertura automatica
        state["active"] = False
        answers: Dict[int, int] = {}
        for _, idx in state.get("answers", {}).items():
            answers[idx] = answers.get(idx, 0) + 1

        return QuizState(
            active=False,
            question=state.get("question"),
            options=state.get("options"),
            reveal=True,
            answers_count=answers
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Errore close quiz: {str(e)}")
        raise HTTPException(status_code=500, detail="Errore interno del server")


# ----------------------
# Notes endpoints
# ----------------------

@router.post("/room/{lesson_id}/notes/start", response_model=NotesState)
async def start_notes(
    lesson_id: int,
    current_user: User = Depends(require_roles([Role.tutor])),
    db: Session = Depends(get_db)
):
    try:
        # Verifica tutor
        from app.models.lesson import Lesson
        lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
        if not lesson or lesson.tutor_id != current_user.id:
            raise HTTPException(status_code=403, detail="Solo il tutor può avviare gli appunti AI")

        state = _NOTES_STATE.setdefault(lesson_id, {"active": False, "lines": []})
        state["active"] = True
        logger.info(f"AI notes avviati per lezione {lesson_id}")
        return NotesState(active=True, lines=state["lines"])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Errore start notes: {str(e)}")
        raise HTTPException(status_code=500, detail="Errore interno del server")


@router.post("/room/{lesson_id}/notes/stop", response_model=NotesState)
async def stop_notes(
    lesson_id: int,
    current_user: User = Depends(require_roles([Role.tutor])),
    db: Session = Depends(get_db)
):
    try:
        state = _NOTES_STATE.setdefault(lesson_id, {"active": False, "lines": []})
        state["active"] = False
        logger.info(f"AI notes fermati per lezione {lesson_id}")
        return NotesState(active=False, lines=state["lines"])
    except Exception as e:
        logger.error(f"Errore stop notes: {str(e)}")
        raise HTTPException(status_code=500, detail="Errore interno del server")


@router.get("/room/{lesson_id}/notes", response_model=NotesState)
async def get_notes(
    lesson_id: int,
    current_user: User = Depends(require_roles([Role.student, Role.tutor])),
    db: Session = Depends(get_db)
):
    try:
        # accesso lezione
        agora_service = AgoraService(db)
        if not agora_service.validate_lesson_access(lesson_id, current_user.id):
            raise HTTPException(status_code=403, detail="Accesso negato alla lezione")

        state = _NOTES_STATE.setdefault(lesson_id, {"active": False, "lines": []})
        return NotesState(active=bool(state["active"]), lines=list(state["lines"]))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Errore get notes: {str(e)}")
        raise HTTPException(status_code=500, detail="Errore interno del server")


# ----------------------
# Appunti Finali Lezione
# ----------------------

class GenerateNotesRequest(BaseModel):
    lesson_id: int
    transcript: str

class GenerateNotesResponse(BaseModel):
    notes: str

class SaveNotesRequest(BaseModel):
    notes: str

@router.post("/generate-notes", response_model=GenerateNotesResponse)
async def generate_lesson_notes(
    payload: GenerateNotesRequest,
    current_user: User = Depends(require_roles([Role.tutor])),
    db: Session = Depends(get_db)
):
    """
    Genera appunti formattati dalla trascrizione usando OpenAI
    """
    try:
        from app.models.lesson import Lesson
        from app.core.config import settings
        from openai import OpenAI
        
        # Verifica che sia il tutor della lezione
        lesson = db.query(Lesson).filter(Lesson.id == payload.lesson_id).first()
        if not lesson or lesson.tutor_id != current_user.id:
            raise HTTPException(status_code=403, detail="Solo il tutor della lezione può generare appunti")
        
        # Se OpenAI non configurato, usa trascrizione diretta formattata
        if not settings.OPENAI_API_KEY:
            formatted_notes = f"""# Appunti Lezione - {lesson.subject}

📅 Data: {lesson.start_at.strftime('%d/%m/%Y alle %H:%M')}
👨‍🏫 Tutor: {current_user.first_name} {current_user.last_name}

## 📝 Trascrizione

{payload.transcript}

---
_Appunti generati automaticamente dalla trascrizione della lezione_
"""
            return GenerateNotesResponse(notes=formatted_notes)
        
        # Genera appunti con OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        
        prompt = f"""Sei un assistente educativo esperto. Trasforma questa trascrizione di una lezione di {lesson.subject} in appunti ben strutturati e facili da studiare.

Trascrizione della lezione:
{payload.transcript}

Genera appunti che includano:
1. **Titolo e Introduzione** - Breve sommario degli argomenti trattati
2. **Concetti Chiave** - Elenco puntato dei concetti principali spiegati
3. **Esempi e Spiegazioni** - Dettagli importanti, esempi pratici
4. **Formule o Definizioni** - Se presenti, scrivi formule matematiche usando LaTeX tra \\( \\) per inline o $$ $$ per blocchi
5. **Riassunto Finale** - Breve recap di cosa è stato imparato

IMPORTANTE:
- Scrivi in italiano chiaro e professionale
- Usa formattazione markdown (# per titoli, ** per grassetto, - per elenchi)
- Per formule matematiche usa LaTeX: \\( formula \\) per inline, $$ formula $$ per blocco
- Mantieni uno stile ordinato e pulito
- Sii fedele al contenuto della trascrizione, non inventare
"""
        
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL or "gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Sei un assistente che crea appunti scolastici ben formattati da trascrizioni di lezioni."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        
        generated_notes = (response.choices[0].message.content or "").strip()
        
        logger.info(f"Appunti generati per lezione {payload.lesson_id} - {len(generated_notes)} caratteri")
        
        return GenerateNotesResponse(notes=generated_notes)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Errore generazione appunti: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Errore generazione appunti: {str(e)}")


@router.post("/save-notes/{lesson_id}")
async def save_lesson_notes(
    lesson_id: int,
    payload: SaveNotesRequest,
    current_user: User = Depends(require_roles([Role.tutor])),
    db: Session = Depends(get_db)
):
    """
    Salva gli appunti confermati dal tutor nella lezione
    """
    try:
        from app.models.lesson import Lesson
        
        # Verifica che sia il tutor della lezione
        lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
        if not lesson or lesson.tutor_id != current_user.id:
            raise HTTPException(status_code=403, detail="Solo il tutor della lezione può salvare appunti")
        
        # Salva appunti nella lezione
        lesson.notes_text = payload.notes
        lesson.status = "completed"  # Marca lezione come completata
        db.commit()
        
        logger.info(f"Appunti salvati per lezione {lesson_id} - {len(payload.notes)} caratteri")
        
        return {
            "message": "Appunti salvati con successo",
            "lesson_id": lesson_id,
            "notes_length": len(payload.notes)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Errore salvataggio appunti: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Errore salvataggio appunti: {str(e)}")
