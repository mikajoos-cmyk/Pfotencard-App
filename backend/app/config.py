from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # ... bestehende Einträge ...
    DATABASE_URL: str
    
    # NEU HINZUFÜGEN:
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    class Config:
        env_file = [".env", "../.env"]
        env_file_encoding = 'utf-8'
        extra = "ignore"

settings = Settings()