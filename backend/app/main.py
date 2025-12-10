import os
import shutil

from starlette.responses import FileResponse
from fastapi import Depends, FastAPI, HTTPException, status, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from datetime import timedelta

from . import crud, models, schemas, auth
from .database import engine, get_db
from .config import settings
from supabase import create_client, Client
from jose import jwt
import time

# This creates the tables if they don't exist.
# In a production environment, you would use Alembic for migrations.
models.Base.metadata.create_all(bind=engine)

app = FastAPI()
UPLOADS_DIR = "uploads"
os.makedirs(UPLOADS_DIR, exist_ok=True)

# --- CORS Middleware ---
origins = [
    "https://shadowsr769.vercel.app",
    "https://pfotencard.joos-soft-solutions.de",
    "https://www.pfotencard.joos-soft-solutions.de",
    "https://pfotencard.vercel.app",
    "http://localhost:3000",         # Gängiger React-Port
    "http://localhost:5173",         # Gängiger Vite-Port
    "http://127.0.0.1:5173",         # Vite-Port mit IP statt Name
    "http://127.0.0.1:3000",         # React-Port mit IP statt Name
]

# Allows the frontend (running on a different port) to communicate with the backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # In production, restrict this to your frontend's URL
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Willkommen bei meiner API!"}

# --- AUTHENTICATION ---
@app.post("/api/login", response_model=schemas.Token)
async def login_for_access_token(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = crud.get_user_by_email(db, email=form_data.username)
    print(34567, form_data)
    print(39837, user, not auth.verify_password(form_data.password, user.hashed_password), form_data.password, user.hashed_password)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    # Fetch full user details for the response
    full_user_details = schemas.User.from_orm(user)
    return {"access_token": access_token, "token_type": "bearer", "user": full_user_details}

@app.get("/api/users/me", response_model=schemas.User)
async def read_users_me(current_user: schemas.User = Depends(auth.get_current_active_user)):
    return current_user

# --- USERS / CUSTOMERS ---
@app.post("/api/users", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)


# In backend/app/main.py

@app.get("/api/users", response_model=List[schemas.User])
def read_users(
        skip: int = 0,
        limit: int = 100,
        db: Session = Depends(get_db),
        current_user: schemas.User = Depends(auth.get_current_active_user)
):
    # Sicherheitsprüfung: Nur Admins und Mitarbeiter dürfen die Nutzerliste abrufen.
    if current_user.role not in ['admin', 'mitarbeiter']:
        raise HTTPException(status_code=403, detail="Not authorized to access this resource")

    # Hier können wir die Logik für Mitarbeiter-Portfolios später einfügen, falls nötig.
    # Fürs Erste ist die Funktion für berechtigte Nutzer unverändert.
    users = crud.get_users(db, skip=skip, limit=limit)
    return users

@app.put("/api/users/{user_id}/level", response_model=schemas.User)
def update_user_level_endpoint(
    user_id: int,
    level_update: schemas.UserLevelUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_active_user)
):
    if current_user.role not in ['admin', 'mitarbeiter']:
         raise HTTPException(status_code=403, detail="Not authorized to perform this action")
    return crud.update_user_level(db=db, user_id=user_id, new_level_id=level_update.level_id)

@app.put("/api/users/{user_id}/vip", response_model=schemas.User)
def update_user_vip_status_endpoint(
    user_id: int,
    vip_update: schemas.UserVipUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_active_user)
):
    if current_user.role not in ['admin', 'mitarbeiter']:
        raise HTTPException(status_code=403, detail="Not authorized to perform this action")
    return crud.update_user_vip_status(db=db, user_id=user_id, is_vip=vip_update.is_vip)

@app.put("/api/users/{user_id}/expert", response_model=schemas.User)
def update_user_expert_status_endpoint(
    user_id: int,
    expert_update: schemas.UserExpertUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_active_user)
):
    if current_user.role not in ['admin', 'mitarbeiter']:
        raise HTTPException(status_code=403, detail="Not authorized to perform this action")
    return crud.update_user_expert_status(db=db, user_id=user_id, is_expert=expert_update.is_expert)

@app.put("/api/users/{user_id}", response_model=schemas.User)
def update_user_endpoint(
    user_id: int,
    user_update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_active_user)
):
    # Sicherheitsprüfung: Admins, Mitarbeiter oder der Benutzer selbst dürfen bearbeiten
    is_self = current_user.id == user_id
    is_staff = current_user.role in ['admin', 'mitarbeiter']
    
    if not is_staff and not is_self:
        raise HTTPException(status_code=403, detail="Not authorized to perform this action")
    
    # Wenn ein Kunde seine eigenen Daten bearbeitet, darf er nur bestimmte Felder ändern
    if is_self and current_user.role == 'kunde':
        # Erstelle ein eingeschränktes Update-Objekt nur mit erlaubten Feldern
        allowed_fields = {
            'name': user_update.name,
            'email': user_update.email,
            'phone': user_update.phone,
            # Alle anderen Felder werden ignoriert (role, balance, level_id, etc.)
        }
        # Erstelle ein neues UserUpdate-Objekt mit den erlaubten Feldern
        # und den aktuellen Werten für die nicht-änderbaren Felder
        user_update.role = current_user.role
        user_update.balance = current_user.balance
        user_update.level_id = current_user.level_id
        user_update.is_vip = current_user.is_vip
        user_update.is_expert = current_user.is_expert
        user_update.is_active = current_user.is_active

    updated_user = crud.update_user(db=db, user_id=user_id, user=user_update)
    if updated_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return updated_user

@app.put("/api/users/{user_id}/status", response_model=schemas.User)
def update_user_status_endpoint(
    user_id: int,
    status_update: schemas.UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_active_user)
):
    if current_user.role not in ['admin', 'mitarbeiter']:
        raise HTTPException(status_code=403, detail="Not authorized")
    return crud.update_user_status(db=db, user_id=user_id, status=status_update)

@app.get("/api/users/search", response_model=List[schemas.User])
def search_users(q: str, db: Session = Depends(get_db)):
    users = crud.search_users(db, search_term=q)
    return users


# In backend/app/main.py

@app.get("/api/users/{user_id}", response_model=schemas.User)
def read_user(
        user_id: int,
        db: Session = Depends(get_db),
        current_user: schemas.User = Depends(auth.get_current_active_user)
):
    # Admins und Mitarbeiter dürfen jeden beliebigen Nutzer/Kunden aufrufen.
    if current_user.role in ['admin', 'mitarbeiter']:
        db_user = crud.get_user(db, user_id=user_id)
        if db_user is None:
            raise HTTPException(status_code=404, detail="User not found")
        return db_user

    # Kunden dürfen nur ihr eigenes Profil aufrufen.
    elif current_user.role == 'kunde' and current_user.id == user_id:
        return crud.get_user(db, user_id=user_id)

    # Alle anderen Anfragen werden blockiert.
    else:
        raise HTTPException(status_code=403, detail="Not authorized to access this user")

@app.delete("/api/users/{user_id}", status_code=status.HTTP_200_OK)
def delete_user_endpoint(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_active_user)
):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can delete users")

    result = crud.delete_user(db=db, user_id=user_id)
    if result is None:
        raise HTTPException(status_code=404, detail="User not found")
    return result

# --- TRANSACTIONS ---
@app.post("/api/transactions", response_model=schemas.Transaction)
def create_transaction(
    transaction: schemas.TransactionCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_active_user)
):
    # Only admins and staff can book transactions
    if current_user.role not in ['admin', 'mitarbeiter']:
         raise HTTPException(status_code=403, detail="Not authorized to perform this action")
    return crud.create_transaction(db=db, transaction=transaction, booked_by=current_user)


# In backend/app/main.py

@app.get("/api/transactions", response_model=List[schemas.Transaction])
def read_transactions(
        skip: int = 0,
        limit: int = 200,
        db: Session = Depends(get_db),
        current_user: schemas.User = Depends(auth.get_current_active_user)
):
    if current_user.role == 'kunde':
        return crud.get_transactions_for_user(db=db, user_id=current_user.id)

    # NEU: Eigener Fall für Mitarbeiter
    if current_user.role == 'mitarbeiter':
        return crud.get_transactions_for_user(db=db, user_id=current_user.id, for_staff=True)

    if current_user.role == 'admin':
        return crud.get_transactions(db=db, skip=skip, limit=limit)

    raise HTTPException(status_code=403, detail="Not authorized to perform this action")

    # FÜGE DIESEN CODE ZUM TESTEN AM ENDE DER DATEI HINZU
@app.get("/api/test-password")
def test_password_verification():
    # Das Passwort, das wir testen
    plain_password = "passwort"

    # Der exakte Hash aus deiner database.sql-Datei
    hashed_password_from_db = "$2b$12$EixZaYVK1gSo9vS.D.rZa.9.DxV2a.2iHnsy.j5wZ.kZ3c8.r9h3S"

    # Wir rufen die Verifizierungsfunktion direkt auf
    is_verified = auth.verify_password(plain_password, hashed_password_from_db)

    # Wir generieren auch einen frischen Hash zum Vergleich
    new_hash = auth.get_password_hash(plain_password)

    return {
        "info": "Direkter Test der Passwort-Verifizierung",
        "password_to_check": plain_password,
        "hash_from_db": hashed_password_from_db,
        "verification_result": is_verified,
        "newly_generated_hash_for_comparison": new_hash
    }

@app.put("/api/dogs/{dog_id}", response_model=schemas.Dog)
def update_dog_endpoint(
    dog_id: int,
    dog_update: schemas.DogBase,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_active_user)
):
    # Hole den Hund aus der Datenbank
    db_dog = crud.get_dog(db, dog_id=dog_id)
    if not db_dog:
        raise HTTPException(status_code=404, detail="Dog not found")
    
    # Sicherheitsprüfung: Admin, Mitarbeiter oder der Besitzer des Hundes dürfen bearbeiten
    is_owner = db_dog.owner_id == current_user.id
    is_staff = current_user.role in ['admin', 'mitarbeiter']
    
    if not is_staff and not is_owner:
        raise HTTPException(status_code=403, detail="Not authorized to perform this action")

    return crud.update_dog(db=db, dog_id=dog_id, dog=dog_update)

@app.post("/api/users/{user_id}/documents", response_model=schemas.Document)
def upload_document_for_user(
    user_id: int,
    upload_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_active_user)
):
    if current_user.role not in ['admin', 'mitarbeiter'] and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    file_path = os.path.join(UPLOADS_DIR, upload_file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)

    return crud.create_document(
        db=db, user_id=user_id, file_name=upload_file.filename,
        file_type=upload_file.content_type, file_path=file_path
    )

@app.get("/api/documents/{document_id}")
def read_document(document_id: int, db: Session = Depends(get_db)):
    db_doc = crud.get_document(db, document_id=document_id)
    if not db_doc or not os.path.exists(db_doc.file_path):
        raise HTTPException(status_code=404, detail="Document not found")
    return FileResponse(path=db_doc.file_path, filename=db_doc.file_name)

@app.delete("/api/documents/{document_id}")
def delete_document_endpoint(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_active_user)
):
    db_doc = crud.get_document(db, document_id=document_id)
    if not db_doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if current_user.role not in ['admin', 'mitarbeiter'] and current_user.id != db_doc.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Physische Datei löschen
    if os.path.exists(db_doc.file_path):
        os.remove(db_doc.file_path)

    # Datenbankeintrag löschen
    crud.delete_document(db, document_id=document_id)
    return {"ok": True, "detail": "Document deleted successfully"}

@app.post("/api/users/{user_id}/dogs", response_model=schemas.Dog)
def create_dog_for_user_endpoint(
    user_id: int,
    dog: schemas.DogCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_active_user)
):
    if current_user.role not in ['admin', 'mitarbeiter']:
        raise HTTPException(status_code=403, detail="Not authorized")

    db_user = crud.get_user(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    return crud.create_dog_for_user(db=db, dog=dog, user_id=user_id)

# Route zum Löschen eines Hundes
@app.delete("/api/dogs/{dog_id}", status_code=status.HTTP_200_OK)
def delete_dog_endpoint(
    dog_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_active_user)
):
    if current_user.role not in ['admin', 'mitarbeiter']:
        raise HTTPException(status_code=403, detail="Not authorized")

    result = crud.delete_dog(db=db, dog_id=dog_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Dog not found")
    return result


@app.post("/api/register", response_model=schemas.User)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # 1. Create User in Supabase (if password provided)
    if user.password:
        try:
            # Mint Service Role Token
            payload = {
                "role": "service_role",
                "iss": "supabase",
                "iat": int(time.time()),
                "exp": int(time.time()) + 600, # 10 mins validity
            }
            service_role_token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
            
            # Init Supabase Admin Client
            supabase: Client = create_client(settings.SUPABASE_URL, service_role_token)
            
            # Create User (Auto-Confirm)
            # Note: create_user implementation in supabase-py wraps admin.create_user
            # We call auth.admin.create_user
            supabase.auth.admin.create_user({
                "email": user.email,
                "password": user.password,
                "email_confirm": True
            })
            print(f"Supabase User created (auto-verified): {user.email}")
            
        except Exception as e:
            # If user already exists in Supabase, we might proceed or error.
            # Using generic catch for safety, but printing error.
            print(f"Supabase Creation Error (might already exist): {e}")

    # 2. Local DB Creation
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)
