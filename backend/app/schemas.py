from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date


# --- Base and Create Schemas ---

class DogBase(BaseModel):
    name: str
    breed: Optional[str] = None
    birth_date: Optional[date] = None
    chip: Optional[str] = None

class DogCreate(DogBase):
    pass


class UserBase(BaseModel):
    email: str
    name: str
    role: str
    is_active: bool = True
    balance: float = 0.0
    phone: Optional[str] = None
    level_id: int = 1
    is_vip: bool = False
    is_expert: bool = False

class UserCreate(UserBase):
    password: Optional[str] = None # <-- HIER DIE ÄNDERUNG
    dogs: List[DogCreate] = []

class UserUpdate(UserBase):
    password: Optional[str] = None

class UserStatusUpdate(BaseModel):
    is_vip: Optional[bool] = None
    is_expert: Optional[bool] = None

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
    is_consumed: bool  # <-- NEUE ZEILE

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

class UserLevelUpdate(BaseModel):
    level_id: int

class UserVipUpdate(BaseModel):
    is_vip: bool

class UserExpertUpdate(BaseModel):
    is_expert: bool