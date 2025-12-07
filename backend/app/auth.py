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
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


# --- WICHTIG: DIE KORRIGIERTE FUNKTION ---
async def get_current_active_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> schemas.User:
    """
    Validiert den Supabase JWT Token und holt den Benutzer aus der DB.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # 1. Token dekodieren
        # WICHTIG: verify_aud=False ist nötig, da Supabase "authenticated" als Audience nutzt
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM], 
            options={"verify_aud": False} 
        )
        
        # 2. E-Mail aus dem Feld "email" lesen (NICHT "sub")
        email: str = payload.get("email")
        
        if email is None:
            print("DEBUG: Keine E-Mail im Token gefunden.")
            raise credentials_exception
            
        token_data = schemas.TokenData(email=email)
        
    except JWTError as e:
        print(f"DEBUG: JWT Error: {e}")
        raise credentials_exception

    # 3. Benutzer in der Datenbank suchen
    user = crud.get_user_by_email(db, email=token_data.email)
    
    if user is None:
        print(f"DEBUG: User mit Email {token_data.email} nicht in DB gefunden.")
        # Falls der Token gültig ist, aber der User fehlt -> 401
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    return user