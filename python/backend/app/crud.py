from sqlalchemy.orm import Session
from . import models, schemas, auth
from fastapi import HTTPException


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
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        name=user.name,
        role=user.role,
        is_active=user.is_active,
        balance=user.balance,
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


# --- TRANSACTION ---
def create_transaction(db: Session, transaction: schemas.TransactionCreate, booked_by: models.User):
    customer = get_user(db, user_id=transaction.user_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Bonus Logic
    amount_to_add = transaction.amount
    bonus = 0
    if transaction.type == "Aufladung" and amount_to_add >= 200:
        bonus = 25
    elif transaction.type == "Aufladung" and amount_to_add >= 100:
        bonus = 10

    total_change = amount_to_add + bonus

    # Update customer balance
    customer.balance += total_change
    db.add(customer)

    db_transaction = models.Transaction(
        user_id=customer.id,
        type=transaction.type,
        description=transaction.description,
        amount=total_change,
        balance_after=customer.balance,
        booked_by_id=booked_by.id
    )
    db.add(db_transaction)

    # Create achievement if a requirementId is passed
    if transaction.requirement_id:
        create_achievement(db, user_id=customer.id, requirement_id=transaction.requirement_id)

    db.commit()
    db.refresh(db_transaction)
    return db_transaction


# --- ACHIEVEMENT ---
def create_achievement(db: Session, user_id: int, requirement_id: str):
    # Check if achievement already exists
    exists = db.query(models.Achievement).filter_by(user_id=user_id, requirement_id=requirement_id).first()
    if not exists:
        db_achievement = models.Achievement(user_id=user_id, requirement_id=requirement_id)
        db.add(db_achievement)
        db.commit()
        db.refresh(db_achievement)
        return db_achievement
    return exists
