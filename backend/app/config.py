from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # ... bestehende Einträge ...
    DATABASE_URL: str = "postgresql://postgres.iwzyptinnwgswtdholxd:vlcQKanegFLSsAma@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"
    
    # NEU HINZUFÜGEN:
    SUPABASE_URL: str = "https://iwzyptinnwgswtdholxd.supabase.co" 

    SECRET_KEY: str = "juNEkEYbtD1qVdQMIgJ3XakApSo2NESxeJAcpASQkrnrMRMlgpaO9fMhhDj9XM/JtDN6sTkpabM9G7Z+/PrYyA=="
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    class Config:
        env_file = ".env"

settings = Settings()