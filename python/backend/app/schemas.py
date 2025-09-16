from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date


# --- Base and Create Schemas ---

class DogBase(BaseModel):
    name: str
    breed: Optional[str] = None
    birth_date: Optional[date] = None


class DogCreate(DogBase):
    pass


class UserBase(BaseModel):
    email: str
    name: str
    role: str
    is_active: bool = True
    balance: float = 0.0


class UserCreate(UserBase):
    password: str
    dogs: List[DogCreate] = []


class TransactionBase(BaseModel):
    type: str
    description: Optional[str] = None
    amount: float


class TransactionCreate(TransactionBase):
    user_id: int
    requirement_id: Optional[str] = None  # For achievements


# --- Full Schemas with Relationships (for responses) ---

class Dog(DogBase):
    id: int
    owner_id: int

    class Config:
        from_attributes = True


class Achievement(BaseModel):
    id: int
    requirement_id: str
    date_achieved: datetime

    class Config:
        from_attributes = True


class Transaction(TransactionBase):
    id: int
    user_id: int
    date: datetime
    balance_after: float
    booked_by_id: int

    class Config:
        from_attributes = True


class Document(BaseModel):
    id: int
    file_name: str
    file_type: str
    upload_date: datetime
    file_path: str

    class Config:
        from_attributes = True


class User(UserBase):
    id: int
    customer_since: datetime
    dogs: List[Dog] = []
    transactions: List[Transaction] = []
    achievements: List[Achievement] = []
    documents: List[Document] = []

    class Config:
        from_attributes = True


# --- For Login ---
class Token(BaseModel):
    access_token: str
    token_type: str
    user: User


class TokenData(BaseModel):
    email: Optional[str] = None
