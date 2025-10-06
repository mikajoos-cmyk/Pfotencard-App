from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .config import settings
import os

# Argumente für die SSL-Verbindung definieren
# Dies ist notwendig für gehostete Datenbanken wie Aiven
connect_args = {
    "ssl_ca": os.environ.get("MYSQL_SSL_CA"),
    "ssl_cert": os.environ.get("MYSQL_SSL_CERT"),
    "ssl_key": os.environ.get("MYSQL_SSL_KEY"),
}

# Überprüfen, ob SSL-Argumente in der Umgebung vorhanden sind.
# Wenn nicht, wird ein leeres Dictionary verwendet (für lokale Entwicklung).
if not all(connect_args.values()):
    connect_args = {}


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
