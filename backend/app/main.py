import os

from fastapi import Depends, FastAPI, HTTPException, status, UploadFile, File
from fastapi.responses import RedirectResponse, JSONResponse
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

# Supabase Client
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

# --- CORS Middleware ---
origins_regex = r"https://(.*\.)?pfotencard\.de|https://.*\.vercel\.app|http://localhost:\d+"

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=origins_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request, call_next):
    print(f"DEBUG: Request to {request.url.path}")
    return await call_next(request)

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
    # --- SUPABASE AUTH SYNC START ---
    # Wenn ein Admin einen User anlegt und ein Passwort vergibt,
    # legen wir diesen User auch in Supabase an.
    if user.password:
        try:
            # KORREKTUR: Wir nutzen direkt den Service Role Key aus der Config
            # Statt den Token selbst zu signieren.
            supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
            
            # 3. User in Supabase erstellen
            # email_confirm: True -> Admin hat ihn erstellt, also ist er sofort bestätigt
            supabase.auth.admin.create_user({
                "email": user.email,
                "password": user.password,
                "email_confirm": True,
                "user_metadata": { "name": user.name } # Optional: Name auch in Metadaten speichern
            })
            print(f"Supabase User via Admin-Panel erstellt: {user.email}")
            
        except Exception as e:
            # WICHTIG: Prüfen Sie die Logs. Wenn hier ein Fehler auftritt, existiert der User evtl. schon.
            # Wenn es ein kritischer Fehler ist, sollten Sie hier evtl. 'raise HTTPException' machen,
            # damit die Daten nicht inkonsistent werden (User in DB aber nicht in Auth).
            print(f"FEHLER beim Erstellen des Supabase Users: {e}")
            # Optional: Abbrechen, wenn Auth fehlschlägt:
            # raise HTTPException(status_code=500, detail=f"Fehler bei Auth-Erstellung: {e}")

    # --- SUPABASE AUTH SYNC END ---

    # 4. Lokalen Datenbank-Eintrag erstellen (Standard-Logik)
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
    # 1. Grundlegende Berechtigungsprüfung
    is_self = current_user.id == user_id
    is_staff = current_user.role in ['admin', 'mitarbeiter']
    
    if not is_staff and not is_self:
        raise HTTPException(status_code=403, detail="Not authorized to perform this action")
    
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # 2. NEU: E-Mail-Änderung nur für Admins erlauben
    # Wir prüfen, ob eine neue E-Mail gesendet wurde UND ob sie sich von der alten unterscheidet
    if user_update.email and user_update.email.lower().strip() != db_user.email.lower().strip():
        if current_user.role != 'admin':
            # Wenn kein Admin: Fehler werfen!
            raise HTTPException(
                status_code=403, 
                detail="Die E-Mail-Adresse kann aus Sicherheitsgründen nur von einem Administrator geändert werden."
            )

    # 3. Einschränkungen für Kunden (dürfen bestimmte Felder nicht ändern)
    if is_self and current_user.role == 'kunde':
        user_update.role = current_user.role
        user_update.balance = current_user.balance
        user_update.level_id = current_user.level_id
        user_update.is_vip = current_user.is_vip
        user_update.is_expert = current_user.is_expert
        user_update.is_active = current_user.is_active
        # Hinweis: E-Mail-Schutz wird bereits oben in Schritt 2 erledigt

    # 4. Prüfen auf Änderungen für Supabase Sync
    # Da Schritt 2 unberechtigte E-Mail-Änderungen blockiert, kommen wir hier nur hin,
    # wenn die Änderung erlaubt ist (z.B. Admin ändert E-Mail oder User ändert nur Name/Passwort).
    email_changed = user_update.email and user_update.email.lower().strip() != db_user.email.lower().strip()
    password_changed = user_update.password is not None
    name_changed = user_update.name and user_update.name != db_user.name

    # 5. SUPABASE SYNC START
    if email_changed or password_changed or name_changed:
        try:
            print(f"DEBUG: Starte Supabase Sync für User {db_user.email}...")
            supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
            
            # A) User in Supabase finden (über die ALTE E-Mail)
            found_uid = None
            users_response = supabase.auth.admin.list_users(page=1, per_page=1000)
            user_list = users_response if isinstance(users_response, list) else getattr(users_response, 'users', [])
            
            search_email = db_user.email.lower().strip()
            for u in user_list:
                if u.email and u.email.lower().strip() == search_email:
                    found_uid = u.id
                    break
            
            if found_uid:
                attributes = {}
                if email_changed:
                    attributes["email"] = user_update.email
                
                if password_changed:
                    if len(user_update.password) < 6:
                        raise ValueError("Passwort muss mindestens 6 Zeichen lang sein.")
                    attributes["password"] = user_update.password
                
                if name_changed:
                    attributes["user_metadata"] = { "name": user_update.name }
                
                if attributes:
                    supabase.auth.admin.update_user_by_id(found_uid, attributes)
                    print(f"DEBUG: Supabase Update erfolgreich für {found_uid}")
            else:
                # Nur warnen, damit lokale DB trotzdem aktualisiert wird (Selbstheilung)
                print(f"WARNUNG: User {db_user.email} in Supabase nicht gefunden. Sync übersprungen.")

        except Exception as e:
            print(f"FEHLER beim Supabase Update: {e}")
            raise HTTPException(status_code=400, detail=f"Fehler bei der Aktualisierung: {str(e)}")
    # SUPABASE SYNC END

    # 6. Lokales Update durchführen
    updated_user = crud.update_user(db=db, user_id=user_id, user=user_update)
    
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

    # 1. Lokalen User abrufen (wir brauchen die E-Mail)
    user_to_delete = crud.get_user(db, user_id)
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="User not found")

    # 2. SUPABASE SYNC: User auch dort löschen
    try:
        supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        
        # Workaround: Supabase ID anhand der E-Mail finden
        # (Da wir lokal nur Integer-IDs speichern)
        found_uid = None
        # Holt standardmäßig die ersten 50 User. Für größere Apps müsste man paginieren.
        users_response = supabase.auth.admin.list_users() 
        
        # Hinweis: Die Struktur der Response kann je nach Library-Version variieren, 
        # meist ist es direkt eine Liste oder ein Objekt mit einem 'users'-Attribut.
        user_list = users_response if isinstance(users_response, list) else getattr(users_response, 'users', [])

        for u in user_list:
            if u.email == user_to_delete.email:
                found_uid = u.id
                break
        
        if found_uid:
            supabase.auth.admin.delete_user(found_uid)
            print(f"Supabase User erfolgreich gelöscht: {user_to_delete.email}")
        else:
            print(f"Warnung: User {user_to_delete.email} konnte in Supabase nicht gefunden werden (evtl. schon gelöscht).")

    except Exception as e:
        print(f"FEHLER beim Löschen in Supabase: {e}")
        # Optional: Hier Fehler werfen, wenn man das lokale Löschen verhindern will
        # raise HTTPException(status_code=500, detail="Supabase Sync failed")

    # 3. Lokal löschen
    result = crud.delete_user(db=db, user_id=user_id)
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
async def upload_document(  # WICHTIG: async hinzufügen
    user_id: int,
    upload_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_active_user),
):
    if current_user.role not in ['admin', 'mitarbeiter'] and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Dateiinhalt lesen (await ist hier wichtig!)
    file_content = await upload_file.read()
    
    # Pfad im Bucket: user_id/filename
    file_path_in_bucket = f"{user_id}/{upload_file.filename}"

    try:
        supabase.storage.from_("documents").upload(
            path=file_path_in_bucket,
            file=file_content,
            file_options={"content-type": upload_file.content_type, "upsert": "true"}
        )
    except Exception as e:
        print(f"Upload Error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

    # In DB speichern (Pfad ist jetzt der Bucket-Pfad)
    return crud.create_document(db, user_id, upload_file.filename, upload_file.content_type, file_path_in_bucket)

@app.get("/api/documents/{document_id}")
def read_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_active_user),
):
    doc = crud.get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if current_user.role not in ['admin', 'mitarbeiter'] and current_user.id != doc.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    try:
        # Signierte URL für 60 Sekunden erstellen
        res = supabase.storage.from_("documents").create_signed_url(doc.file_path, 60)
        # Wir geben die URL als JSON zurück
        if isinstance(res, dict) and "signedURL" in res:
            return {"url": res["signedURL"]}
        else:
            return {"url": res}
    except Exception as e:
         raise HTTPException(status_code=404, detail="File not found in storage")

@app.delete("/api/documents/{document_id}")
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_active_user),
):
    doc = crud.get_document(db, document_id)
    if not doc: raise HTTPException(status_code=404, detail="Document not found")
    
    if current_user.role not in ['admin', 'mitarbeiter'] and current_user.id != doc.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Datei aus Supabase löschen
    try:
        supabase.storage.from_("documents").remove([doc.file_path])
    except Exception as e:
        print(f"Supabase Delete Error: {e}")

    crud.delete_document(db, document_id)
    return {"ok": True}

@app.post("/api/upload/image")
async def upload_public_image( # WICHTIG: async hinzufügen
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_active_user)
):
    if current_user.role not in ['admin', 'mitarbeiter']:
         raise HTTPException(status_code=403, detail="Not authorized")
         
    import secrets
    from datetime import datetime
    file_ext = os.path.splitext(file.filename)[1]
    safe_name = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{secrets.token_hex(4)}{file_ext}"
    
    file_content = await file.read()
    
    try:
        supabase.storage.from_("public_uploads").upload(
            path=safe_name,
            file=file_content,
            file_options={"content-type": file.content_type, "upsert": "true"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage Error: {str(e)}")
        
    project_url = settings.SUPABASE_URL
    public_url = f"{project_url}/storage/v1/object/public/public_uploads/{safe_name}"
    
    return {"url": public_url}

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
    # Wir prüfen nur, ob die Email in der lokalen DB schon existiert
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Wir erstellen NUR den lokalen Datenbank-User.
    # Der Supabase-Auth-User wurde bereits vom Frontend erstellt.
    return crud.create_user(db=db, user=user)
