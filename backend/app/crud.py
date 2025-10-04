from sqlalchemy.orm import Session
from . import models, schemas, auth
from fastapi import HTTPException
import secrets

# In backend/app/crud.py (ganz oben)

LEVEL_REQUIREMENTS = {
  1: [{"id": 'group_class', "name": 'Gruppenstunde', "required": 6}, {"id": 'exam', "name": 'Prüfung', "required": 1}],
  2: [{"id": 'group_class', "name": 'Gruppenstunde', "required": 6}, {"id": 'exam', "name": 'Prüfung', "required": 1}],
  3: [{"id": 'group_class', "name": 'Gruppenstunde', "required": 6}, {"id": 'exam', "name": 'Prüfung', "required": 1}],
  4: [{"id": 'social_walk', "name": 'Social Walk', "required": 6}, {"id": 'tavern_training', "name": 'Wirtshaustraining', "required": 2}, {"id": 'exam', "name": 'Prüfung', "required": 1}],
  5: [{"id": 'exam', "name": 'Prüfung', "required": 1}],
}

# --- USER ---
def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()


def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).order_by(models.User.name).offset(skip).limit(limit).all()


def search_users(db: Session, search_term: str):
    return db.query(models.User).filter(models.User.name.like(f"%{search_term}%")).all()


def create_user(db: Session, user: schemas.UserCreate):
    # NEU: Wenn kein Passwort übergeben wird, erstelle ein sicheres Zufallspasswort
    if not user.password:
        user.password = secrets.token_urlsafe(16)

    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        name=user.name,
        role=user.role,
        is_active=user.is_active,
        balance=user.balance,
        phone=user.phone,
        level_id=user.level_id,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    for dog_data in user.dogs:
        db_dog = models.Dog(**dog_data.model_dump(), owner_id=db_user.id)
        db.add(db_dog)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: int, user: schemas.UserUpdate):
    db_user = get_user(db, user_id=user_id)
    if not db_user:
        return None

    # Lade die Update-Daten
    update_data = user.model_dump(exclude_unset=True)

    # Wenn ein neues Passwort mitgesendet wurde, hashe es und entferne es aus den restlichen Daten
    if "password" in update_data and update_data["password"]:
        hashed_password = auth.get_password_hash(update_data.pop("password"))
        db_user.hashed_password = hashed_password

    # Aktualisiere die restlichen Felder
    for key, value in update_data.items():
        setattr(db_user, key, value)

    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user_vip_status(db: Session, user_id: int, is_vip: bool):
    db_user = get_user(db, user_id=user_id)
    if not db_user:
        return None
    db_user.is_vip = is_vip
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user_expert_status(db: Session, user_id: int, is_expert: bool):
    db_user = get_user(db, user_id=user_id)
    if not db_user:
        return None
    db_user.is_expert = is_expert
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# In backend/app/crud.py
def update_user_status(db: Session, user_id: int, status: schemas.UserStatusUpdate):
    db_user = get_user(db, user_id=user_id)
    if not db_user:
        return None

    update_data = status.model_dump(exclude_unset=True)

    # NEUE REGEL: Wenn ein Status auf True gesetzt wird, wird der andere auf False gesetzt.
    if update_data.get("is_vip") is True:
        db_user.is_expert = False
    elif update_data.get("is_expert") is True:
        db_user.is_vip = False

    # Übernehme die Änderungen aus dem Request
    for key, value in update_data.items():
        setattr(db_user, key, value)

    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: int):
    db_user = get_user(db, user_id=user_id)
    if not db_user:
        return None
    db.delete(db_user)
    db.commit()
    return {"ok": True}

# --- TRANSACTION ---
def create_transaction(db: Session, transaction: schemas.TransactionCreate, booked_by: models.User):
    customer = get_user(db, user_id=transaction.user_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Bonus Logic
    amount_to_add = transaction.amount
    bonus = 0
    if amount_to_add >= 300:
        bonus = 150
    elif amount_to_add >= 150:
        bonus = 30
    elif amount_to_add >= 100:
        bonus = 15
    elif amount_to_add >= 50:
        bonus = 5
    total_change = amount_to_add + bonus

    # Update customer balance
    customer.balance += total_change
    db.add(customer)

    # Transaktion zuerst erstellen
    db_transaction = models.Transaction(
        user_id=customer.id,
        type=transaction.type,
        description=transaction.description,
        amount=total_change,
        balance_after=customer.balance,
        booked_by_id=booked_by.id
    )
    db.add(db_transaction)
    db.flush()

    # Achievement erstellen und mit der Transaktion verknüpfen
    if transaction.requirement_id:
        create_achievement(
            db,
            user_id=customer.id,
            requirement_id=transaction.requirement_id,
            transaction_id=db_transaction.id
        )

    db.commit()
    db.refresh(db_transaction)
    return db_transaction

def get_transactions(db: Session, skip: int = 0, limit: int = 100):
    """Holt eine Liste von Transaktionen, die neuesten zuerst."""
    return db.query(models.Transaction).order_by(models.Transaction.date.desc()).offset(skip).limit(limit).all()

# --- ACHIEVEMENT ---
def create_achievement(db: Session, user_id: int, requirement_id: str, transaction_id: int):
    # Die alte "exists"-Prüfung wurde entfernt.
    # Es wird jetzt immer ein neuer Eintrag erstellt.
    db_achievement = models.Achievement(
        user_id=user_id,
        requirement_id=requirement_id,
        transaction_id=transaction_id
    )
    db.add(db_achievement)
    return db_achievement

# --- USER LEVEL ---
def update_user_level(db: Session, user_id: int, new_level_id: int):
    print(f"\n--- Starte Level-Up für User ID: {user_id} zu neuem Level: {new_level_id} ---")

    db_user = get_user(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    level_to_complete = db_user.level_id
    print(f"[DEBUG] Aktueller Level des Users (level_to_complete): {level_to_complete}")

    requirements_to_consume = LEVEL_REQUIREMENTS.get(level_to_complete, [])
    print(f"[DEBUG] Benötigte Lektionen für dieses Level: {requirements_to_consume}")

    if not requirements_to_consume:
        print("[DEBUG] Keine Lektionen für dieses Level gefunden. Aktualisiere nur die level_id.")

    unconsumed_achievements = db.query(models.Achievement).filter_by(
        user_id=user_id, is_consumed=False
    ).order_by(models.Achievement.date_achieved).all()
    print(f"[DEBUG] {len(unconsumed_achievements)} unverbrauchte Lektionen für diesen User gefunden.")

    for req in requirements_to_consume:
        print(f"[DEBUG] Prüfe Anforderung: '{req['id']}', benötigt: {req['required']}")
        consumed_count = 0
        # Diese Schleife durchläuft eine Kopie, damit wir das Original verändern können
        for ach in list(unconsumed_achievements):
            if ach.requirement_id == req["id"] and not ach.is_consumed:
                print(f"   -> VERBRAUCHE Lektion ID: {ach.id} für Anforderung '{req['id']}'")
                ach.is_consumed = True
                db.add(ach)
                consumed_count += 1
                unconsumed_achievements.remove(ach) # Entferne, damit es nicht doppelt gezählt wird
                if consumed_count >= req["required"]:
                    break
        print(f"[DEBUG] {consumed_count} von {req['required']} Lektionen für '{req['id']}' verbraucht.")

    db_user.level_id = new_level_id
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    print(f"--- Level-Up für User ID: {user_id} erfolgreich abgeschlossen ---")
    return db_user

def get_dog(db: Session, dog_id: int):
    return db.query(models.Dog).filter(models.Dog.id == dog_id).first()

def update_dog(db: Session, dog_id: int, dog: schemas.DogBase):
    db_dog = get_dog(db, dog_id=dog_id)
    if not db_dog:
        return None

    update_data = dog.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_dog, key, value)

    db.add(db_dog)
    db.commit()
    db.refresh(db_dog)
    return db_dog

# In backend/app/crud.py

def create_document(db: Session, user_id: int, file_name: str, file_type: str, file_path: str):
    db_doc = models.Document(
        user_id=user_id, file_name=file_name, file_type=file_type, file_path=file_path
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    return db_doc

def get_document(db: Session, document_id: int):
    return db.query(models.Document).filter(models.Document.id == document_id).first()

def delete_document(db: Session, document_id: int):
    db_doc = get_document(db, document_id)
    if db_doc:
        db.delete(db_doc)
        db.commit()
        return True
    return False

def create_dog_for_user(db: Session, dog: schemas.DogCreate, user_id: int):
    db_dog = models.Dog(**dog.model_dump(), owner_id=user_id)
    db.add(db_dog)
    db.commit()
    db.refresh(db_dog)
    return db_dog

def delete_dog(db: Session, dog_id: int):
    db_dog = get_dog(db, dog_id=dog_id)
    if not db_dog:
        return None
    db.delete(db_dog)
    db.commit()
    return {"ok": True}