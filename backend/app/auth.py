from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from . import crud, schemas
from .config import settings
from .database import get_db

# Password Hashing Setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 Scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against a hashed one."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hashes a plain password."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Creates a new JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        # Default expiration time if not provided
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


async def get_current_active_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> schemas.User:
    """
    Validiert den Supabase JWT Token und holt den Benutzer aus der DB.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="STALE SERVER DETECTED",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # --- DEBUGGING START ---
    print(f"DEBUG: Starte Token-Validierung...")
    print(f"DEBUG: Token (Start): {token[:10]}...")
    safe_secret_preview = settings.SECRET_KEY[:5] if settings.SECRET_KEY else "NONE"
    print(f"DEBUG: Verwendetes SECRET_KEY (Start): {safe_secret_preview}...")
    # --- DEBUGGING END ---

    try:
        # 1. Token dekodieren
        # WICHTIG: verify_aud=False ist nötig, da Supabase "authenticated" als Audience nutzt
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM], 
            options={"verify_aud": False} 
        )
        
        # --- DEBUGGING START ---
        print(f"DEBUG: Token erfolgreich dekodiert.")
        # print(f"DEBUG: Token Payload: {payload}") # Vorsicht: Zeigt alle Daten im Log
        # --- DEBUGGING END ---

        # 2. E-Mail aus dem Feld "email" lesen (NICHT "sub")
        email: str = payload.get("email")
        
        if email is None:
            print(f"DEBUG: FEHLER - Keine E-Mail im Token gefunden. Payload: {payload.keys()}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Auth error: No email in token payload. Keys found: {list(payload.keys())}",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        print(f"DEBUG: E-Mail aus Token extrahiert: {email}")
        token_data = schemas.TokenData(email=email)
        
    except JWTError as e:
        print(f"DEBUG: JWT Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Auth error: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = crud.get_user_by_email(db, email=token_data.email)
    if user is None:
        print(f"DEBUG: User not found: {token_data.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"User {token_data.email} not found in DB",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="User is inactive")

    print(f"DEBUG: Login erfolgreich für User ID: {user.id}")
    return user