from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # WICHTIG: Tragen Sie hier Ihre MySQL-Zugangsdaten ein!
    # Beispiel: "mysql+mysqlconnector://user:password@hostname/database_name"
    DATABASE_URL: str = "mysql+mysqlconnector://root:borussen@localhost/pfoten_card"

    # Sicherheitsschlüssel für JWT. UNBEDINGT ÄNDERN für den Produktivbetrieb!
    # Kann mit `openssl rand -hex 32` generiert werden.
    SECRET_KEY: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    class Config:
        env_file = ".env"

settings = Settings()
