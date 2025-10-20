from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import hashlib
import base64
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from passlib.exc import PasswordSizeError
from jose import JWTError, jwt
from fastapi import HTTPException, status

from app.core.config import settings
from app.models.user import User, Role, StudentProfile, TutorProfile, ParentProfile
from app.schemas.auth import UserRegister, UserLogin, Token, UserProfile

# Password hashing
pwd_context = CryptContext(
    schemes=["bcrypt_sha256"],
    deprecated="auto",
)

class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verifica password con fallback: plain -> bcrypt_sha256; se fallisce, usa prehash SHA-256 base64url."""
        try:
            if pwd_context.verify(plain_password, hashed_password):
                return True
        except PasswordSizeError:
            # In caso di vecchi container che usano bcrypt puro
            pass

        # Fallback: pre-hash lato server e verifica
        digest = hashlib.sha256(plain_password.encode("utf-8")).digest()
        b64 = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
        try:
            return pwd_context.verify(b64, hashed_password)
        except Exception:
            return False

    def get_password_hash(self, password: str) -> str:
        """Genera hash robusto: sempre pre-hash SHA-256 base64url prima di passare a passlib.
        In questo modo la stringa è corta (<72B) e compatibile con qualsiasi backend bcrypt.
        """
        digest = hashlib.sha256(password.encode("utf-8")).digest()
        b64 = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
        return pwd_context.hash(b64)

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Crea un JWT token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGO)
        return encoded_jwt

    def register_user(self, user_data: UserRegister) -> User:
        """Crea un nuovo utente con il relativo profilo"""
        # Verifica se l'email esiste già
        existing_user = self.db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email già registrata"
            )
        
        # Crea l'utente (gestione robusta limite bcrypt 72 byte)
        try:
            hashed_password = self.get_password_hash(user_data.password)
        except PasswordSizeError:
            # Non dovrebbe più accadere con bcrypt_sha256, ma per sicurezza
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password non valida")
        except Exception:
            # Lasciamo propagare per ottenere un 500 con messaggio reale nei log
            raise
        user = User(
            email=user_data.email,
            hashed_password=hashed_password,
            role=user_data.role,
            is_active=True
        )
        
        self.db.add(user)
        self.db.flush()  # Per ottenere l'ID dell'utente
        
        # Crea il profilo specifico in base al ruolo (coerente con i modelli attuali)
        if user_data.role == Role.student:
            profile = StudentProfile(
                user_id=user.id,
                first_name=user_data.first_name,
                last_name=user_data.last_name,
                school_level=user_data.school_level
            )
        elif user_data.role == Role.tutor:
            profile = TutorProfile(
                user_id=user.id,
                first_name=user_data.first_name,
                last_name=user_data.last_name,
                bio=user_data.bio or "",
                subjects=(user_data.subjects.split(",") if user_data.subjects else []),
                hourly_rate=user_data.hourly_rate or 15.0,
                phone=user_data.phone
            )
        elif user_data.role == Role.parent:
            profile = ParentProfile(
                user_id=user.id,
                first_name=user_data.first_name,
                last_name=user_data.last_name,
                phone=user_data.phone
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ruolo non valido"
            )
        
        self.db.add(profile)
        self.db.commit()
        self.db.refresh(user)
        
        return user

    def login_user(self, login_data: UserLogin) -> Token:
        """Autentica un utente e restituisce un token"""
        user = self.db.query(User).filter(User.email == login_data.email).first()
        
        if not user or not self.verify_password(login_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenziali non valide"
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account disabilitato"
            )
        
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = self.create_access_token(
            data={"sub": user.email, "user_id": user.id, "role": user.role.value},
            expires_delta=access_token_expires
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=int(access_token_expires.total_seconds()),
        )

    def get_user_profile(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Ottiene il profilo completo di un utente, mappato sullo schema UserProfile."""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        
        result: Dict[str, Any] = {
            "id": user.id,
            "email": user.email,
            "role": user.role.value,
            "is_active": user.is_active,
            "created_at": user.created_at,
        }
        
        if user.role == Role.student and user.student_profile:
            sp = user.student_profile
            result.update({
                "first_name": sp.first_name,
                "last_name": sp.last_name,
                "school_level": sp.school_level,
            })
        elif user.role == Role.tutor and user.tutor_profile:
            tp = user.tutor_profile
            # subjects in questo modello è String; ritorniamo la stringa
            result.update({
                "first_name": tp.first_name,
                "last_name": tp.last_name,
                "bio": tp.bio,
                "subjects": tp.subjects,
                "hourly_rate": tp.hourly_rate,
                "is_verified": tp.is_verified,
            })
        elif user.role == Role.parent and user.parent_profile:
            pp = user.parent_profile
            result.update({
                "first_name": pp.first_name,
                "last_name": pp.last_name,
                "phone": pp.phone,
            })
        else:
            # Profili mancanti
            result.update({"first_name": "", "last_name": ""})
        
        return result
