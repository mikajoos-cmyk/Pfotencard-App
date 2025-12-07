from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # WICHTIG: Tragen Sie hier Ihre PostgreSQL/Supabase-Zugangsdaten ein!
    # Beispiel: "postgresql://user:password@host:port/database_name"
    DATABASE_URL: str = "postgresql://postgres.iwzyptinnwgswtdholxd:vlcQKanegFLSsAma@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"

    # Sicherheitsschlüssel für JWT. UNBEDINGT ÄNDERN für den Produktivbetrieb!
    # Kann mit `openssl rand -hex 32` generiert werden.
    SECRET_KEY: str = "18cc570f-a632-4362-8c7e-68016b3502b6"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    class Config:
        env_file = ".env"

settings = Settings()
