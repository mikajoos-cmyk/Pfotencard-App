from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .config import settings

# Dies ist der direkteste Weg, um mysql-connector-python
# zur Verwendung von SSL zu zwingen, ohne komplexe Zertifikate.
connect_args = {
    "ssl_disabled": False
}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
