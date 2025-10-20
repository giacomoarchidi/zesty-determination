from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.db import get_db
from app.models.user import User, Role

# Password hashing: usa solo bcrypt_sha256 (niente limite 72 byte)
pwd_context = CryptContext(
    schemes=["bcrypt_sha256"],
    deprecated="auto",
)

# JWT token scheme
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash con bcrypt_sha256 (no limite 72 byte)."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGO)
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGO])
        return payload
    except JWTError as e:
        with open("/tmp/jwt_debug.log", "a") as f:
            f.write(f"❌ JWT Error: {type(e).__name__}: {str(e)}\n")
        return None


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = credentials.credentials
    
    # Log to file instead of print
    with open("/tmp/jwt_debug.log", "a") as f:
        f.write(f"🔵 Received token: {token[:50]}...\n")
    
    payload = verify_token(token)
    
    with open("/tmp/jwt_debug.log", "a") as f:
        f.write(f"🔵 Decoded payload: {payload}\n")
    
    if payload is None:
        with open("/tmp/jwt_debug.log", "a") as f:
            f.write("❌ Payload is None - token invalid\n")
        raise credentials_exception
    
    # Support both formats: payload with numeric user_id (preferred) or email in sub
    raw_user_id = payload.get("user_id")
    user_email = payload.get("sub")
    
    with open("/tmp/jwt_debug.log", "a") as f:
        f.write(f"🔵 Payload user_id: {raw_user_id}, sub(email): {user_email}\n")
    
    user = None
    if raw_user_id is not None:
        try:
            user = db.query(User).filter(User.id == int(raw_user_id)).first()
        except Exception as e:
            with open("/tmp/jwt_debug.log", "a") as f:
                f.write(f"❌ Error casting user_id: {e}\n")
    elif user_email:
        user = db.query(User).filter(User.email == user_email).first()
    
    with open("/tmp/jwt_debug.log", "a") as f:
        f.write(f"🔵 User from DB: {user}\n")
    
    if user is None:
        with open("/tmp/jwt_debug.log", "a") as f:
            f.write(f"❌ No user found (user_id={raw_user_id}, sub={user_email})\n")
        raise credentials_exception
    
    with open("/tmp/jwt_debug.log", "a") as f:
        f.write(f"✅ User authenticated: {user.email} (role: {user.role})\n")
    
    return user


def require_role(required_role: Role):
    """Decorator to require specific user role"""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker


def require_roles(required_roles: list[Role]):
    """Decorator to require any of the specified user roles"""
    def roles_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return roles_checker
